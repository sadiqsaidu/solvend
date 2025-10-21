import { Request, Response } from 'express';
import { keccak256 } from 'js-sha3';
import { Purchase } from '../../database/models/purchase.model';
import { redeemVoucherOnChain } from '../../services/solana.service';
import { PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import * as anchor from '@project-serum/anchor';
import { v4 as uuidv4 } from 'uuid';

const BACKEND_WALLET_PATH = process.env.BACKEND_WALLET_PATH || './keys/backend.json';

function loadWalletKeypair(): Keypair {
  const kp = JSON.parse(fs.readFileSync(path.resolve(BACKEND_WALLET_PATH), 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(kp));
}

export async function validateOtpHandler(req: Request, res: Response) {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'OTP required' });

    const otpHashHex = keccak256(otp);
    const purchase = await Purchase.findOne({ otpHash: otpHashHex });
    if (!purchase) return res.status(404).json({ error: 'Invalid OTP' });

    if (purchase.otpExpiry && new Date() > purchase.otpExpiry)
      return res.status(400).json({ error: 'OTP expired' });

    if (purchase.status !== 'VOUCHER_CREATED')
      return res.status(400).json({ error: 'Invalid purchase status' });

    if (!purchase.userWallet || !purchase.nonce)
      return res.status(500).json({ error: 'Missing userWallet or nonce' });

    const backendKeypair = loadWalletKeypair();
    const userPk = new PublicKey(purchase.userWallet);
    const programId = new PublicKey(process.env.PROGRAM_ID!);

    const nonceBytes = new anchor.BN(purchase.nonce).toArrayLike(Buffer, 'le', 8);
    const [voucherPda] = await PublicKey.findProgramAddress(
      [Buffer.from('voucher'), userPk.toBuffer(), Buffer.from(nonceBytes)],
      programId
    );

    const tx = await redeemVoucherOnChain({
      userPubkey: userPk.toBase58(),
      voucherPda,
      nonce: purchase.nonce,
      backendKeypair,
      programIdString: process.env.PROGRAM_ID!,
    });

    purchase.status = 'REDEEMED';
    await purchase.save();

    return res.json({ success: true, tx });
  } catch (err) {
    console.error('[validateOtpHandler]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createPurchaseHandler(req: Request, res: Response) {
  try {
    const { userWallet, amount } = req.body;
    
    if (!userWallet || !amount) {
      return res.status(400).json({ error: 'userWallet and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Generate unique reference ID
    const referenceId = uuidv4();

    // Create purchase record in database
    const purchase = new Purchase({
      referenceId,
      userWallet,
      amount,
      status: 'PENDING'
    });

    await purchase.save();

    // Return payment information
    const treasuryTokenAccount = process.env.TREASURY_TOKEN_ACCOUNT;
    if (!treasuryTokenAccount) {
      return res.status(500).json({ error: 'Treasury token account not configured' });
    }

    return res.json({
      referenceId,
      treasuryTokenAccount,
      amount,
      memo: referenceId
    });
  } catch (err) {
    console.error('[createPurchaseHandler]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
