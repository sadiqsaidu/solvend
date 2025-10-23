import { Connection, PublicKey, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { keccak256 } from 'js-sha3';
import { Purchase } from '../database/models/purchase.model';
import { createVoucherOnChain } from '../services/solana.service';
import fs from 'fs';
import path from 'path';
import * as anchor from '@project-serum/anchor';

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const TREASURY_TOKEN_ACCOUNT = process.env.TREASURY_TOKEN_ACCOUNT!;
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const BACKEND_WALLET_PATH = process.env.BACKEND_WALLET_PATH || './keys/backend.json';
const PROGRAM_ID = process.env.PROGRAM_ID!;
const POLL_INTERVAL_MS = 4000;

function loadWalletKeypair() {
  const kp = JSON.parse(fs.readFileSync(path.resolve(BACKEND_WALLET_PATH), 'utf8'));
  return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(kp));
}

export function startPaymentListener() {
  const connection = new Connection(RPC, 'confirmed');
  const treasuryPubkey = new PublicKey(TREASURY_TOKEN_ACCOUNT);
  const backendKeypair = loadWalletKeypair();
  const seen = new Set<string>();

  console.log('[listener] Watching treasury:', treasuryPubkey.toBase58());

  setInterval(async () => {
    try {
      const signatures = await connection.getSignaturesForAddress(treasuryPubkey, { limit: 20 });
      for (const sigInfo of signatures.reverse()) {
        if (seen.has(sigInfo.signature)) continue;
        seen.add(sigInfo.signature);

        const tx = await connection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0 });
        if (!tx || tx.meta?.err) continue;

        const instructions = tx.transaction.message.instructions as (
          | ParsedInstruction
          | PartiallyDecodedInstruction
        )[];

        // --- find memo instruction ---
        let referenceId: string | null = null;
        for (const ix of instructions as any[]) {
          const programId = 'programId' in ix ? ix.programId.toString() : ix.program;
          if (programId === MEMO_PROGRAM_ID) {
            const data = ix.parsed?.info?.memo ?? ix.data ?? null;
            if (typeof data === 'string') referenceId = data;
            else if (data) referenceId = Buffer.from(data).toString('utf8');
            break;
          }
        }

  const payerRaw = tx.transaction.message.accountKeys.find((k: any) => k.signer)?.pubkey;
  // normalize payer to a pubkey string
  const payer = typeof payerRaw === 'string' ? payerRaw : (payerRaw?.toString ? payerRaw.toString() : null);
  if (!referenceId || !payer) continue;

        const purchase = await Purchase.findOne({ referenceId, status: 'PENDING' });
        if (!purchase) continue;

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const otpHashHex = keccak256(otp);
        const otpHashBytes = Buffer.from(otpHashHex, 'hex');

        purchase.otpHash = otpHashHex;
        purchase.otpExpiry = new Date(Date.now() + 60 * 60 * 1000);
        purchase.userWallet = payer;
        await purchase.save();

        const nonce = Date.now();
        try {
          // expiry_ts in seconds and is_free flag (false by default)
          const expiryTs = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour expiry
          const isFree = false;
          await createVoucherOnChain({
            userPubkey: payer,
            hashBytes: Array.from(otpHashBytes),
            expiryTs,
            isFree,
            nonce,
            backendKeypair,
            programIdString: PROGRAM_ID,
          });

          purchase.status = 'VOUCHER_CREATED';
          purchase.nonce = nonce;
          await purchase.save();

          console.log(`[listener] Voucher created for ${referenceId}, OTP=${otp}`);
        } catch (err) {
          console.error('[listener] createVoucher failed', err);
          purchase.status = 'PENDING'; // fallback
          await purchase.save();
        }
      }
    } catch (err) {
      console.error('[listener] poll error', err);
    }
  }, POLL_INTERVAL_MS);
}
