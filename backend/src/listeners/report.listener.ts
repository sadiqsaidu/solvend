import { Connection, PublicKey, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { Report } from '../database/models/report.model';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import * as anchor from '@project-serum/anchor';

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const TREASURY_TOKEN_ACCOUNT = process.env.TREASURY_TOKEN_ACCOUNT!;
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const BACKEND_WALLET_PATH = process.env.BACKEND_WALLET_PATH || './keys/backend.json';
const POLL_INTERVAL_MS = 4000;

function loadWalletKeypair() {
  const kp = JSON.parse(fs.readFileSync(path.resolve(BACKEND_WALLET_PATH), 'utf8'));
  return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(kp));
}

export function startReportListener() {
  const connection = new Connection(RPC, 'confirmed');
  const treasuryPubkey = new PublicKey(TREASURY_TOKEN_ACCOUNT);
  const seen = new Set<string>();

  console.log('[report-listener] Watching treasury for report payments:', treasuryPubkey.toBase58());

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

        // Find memo instruction
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
        const payer = typeof payerRaw === 'string' ? payerRaw : (payerRaw?.toString ? payerRaw.toString() : null);
        if (!referenceId || !payer) continue;

        // Check if this is a report purchase
        const report = await Report.findOne({ referenceId, status: 'PENDING' });
        if (!report) continue;

        try {
          // --- FIXED LOGIC START ---
          // The listener only verifies the payment and updates the DB.
          report.status = 'PAID';
          report.transactionSignature = sigInfo.signature;

          // Warn if payer doesn’t match recorded buyer
          if (report.buyerWallet !== payer) {
            console.warn(
              `[report-listener] Payer ${payer} does not match buyer ${report.buyerWallet} for ${referenceId}. Marking as PAID.`
            );
            // Optionally handle mismatch differently if needed
          }

          await report.save();
          console.log(`[report-listener] Report ${report.reportId} (Ref: ${referenceId}) marked as PAID.`);
          // --- FIXED LOGIC END ---
        } catch (err) {
          console.error('[report-listener] Failed to update report status', err);
        }
      }
    } catch (err) {
      console.error('[report-listener] poll error', err);
    }
  }, POLL_INTERVAL_MS);
}
