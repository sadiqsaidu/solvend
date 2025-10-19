import { Connection, PublicKey, ParsedInstruction } from '@solana/web3.js';
import { keccak256 } from 'js-sha3';
import { Purchase } from '../database/models/purchase.model';
import { createVoucherOnChain } from '../services/solana.service';
import { sendOtpToUser } from '../services/notification.service';

const connection = new Connection(process.env.SOLANA_RPC_HOST!, 'confirmed');
const programId = new PublicKey(process.env.PROGRAM_ID!);
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcVnuNEbbYhS2soV4gp');

export function startListener() {
  console.log('💡 Starting blockchain listener for program:', programId.toBase58());

  connection.onLogs(
    programId,
    async ({ signature }) => {
      const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
      if (!tx || tx.meta?.err) return;

      const instructions = tx.transaction.message.instructions;
      const memoIx = instructions.find(
        (ix) => ix.programId.equals(MEMO_PROGRAM_ID)
      ) as ParsedInstruction | undefined;

      if (!memoIx || !('data' in memoIx) || typeof memoIx.data !== 'string') return;

      const referenceId = Buffer.from(memoIx.data, 'base64').toString('utf-8');
      const userWallet = tx.transaction.message.accountKeys[0].pubkey;

      const purchase = await Purchase.findOne({ referenceId, status: 'PENDING' });
      if (!purchase) return;

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpHash = Buffer.from(keccak256.digest(otp));
      const nonce = Date.now();

      await createVoucherOnChain(userWallet, otpHash, nonce);

      purchase.transactionSignature = signature;
      purchase.status = 'VOUCHER_CREATED';
      purchase.otpHash = keccak256(otp);
      purchase.otpExpiry = new Date(Date.now() + 3600 * 1000);
      purchase.nonce = nonce;
      await purchase.save();

      console.log(`Voucher created for purchase ${referenceId}. OTP: ${otp}`);
      sendOtpToUser(userWallet.toBase58(), otp);
    },
    'confirmed'
  );
}