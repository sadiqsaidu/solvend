// ...existing code...
const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');

async function main() {
  if (process.argv.length < 6) {
    console.log('Usage: node send_memo.js <keypair.json> <treasury_pubkey> <amount_in_SOL> <memo>');
    process.exit(1);
  }

  const keypairPath = process.argv[2];
  const treasury = new PublicKey(process.argv[3]);
  const amountSol = parseFloat(process.argv[4]);
  const memo = process.argv.slice(5).join(' ');

  const raw = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const secret = Uint8Array.from(raw);
  const payer = Keypair.fromSecretKey(secret);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: treasury,
      lamports,
    }),
    new TransactionInstruction({
      keys: [],
      programId: memoProgramId,
      data: Buffer.from(memo),
    })
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {commitment: 'confirmed'});
  console.log('Signature:', sig);
}

main().catch(err => { console.error(err); process.exit(1); });