import { Request, Response } from 'express';
import { keccak256 } from 'js-sha3';
import { Purchase } from '../../database/models/purchase.model';
import { redeemVoucherOnChain } from '../../services/solana.service';
import { PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import * as anchor from '@project-serum/anchor';

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

    const nonceBytes = new anchor.BN(purchase.nonce).toArrayLike(Uint8Array, 'le', 8);
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
