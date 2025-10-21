import * as anchor from '@project-serum/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import idl from '../../target/idl/solvend_program.json'; // adjust to your IDL

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export async function createVoucherOnChain(opts: {
  userPubkey: string;
  hashBytes: number[];
  nonce: number;
  backendKeypair: Keypair;
  programIdString?: string;
}) {
  const { userPubkey, hashBytes, nonce, backendKeypair, programIdString } = opts;

  const connection = new anchor.web3.Connection(RPC, 'confirmed');
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });

  const programId = new PublicKey(programIdString || process.env.PROGRAM_ID!);
  const program = new anchor.Program(idl as any, programId, provider);

  const userPk = new PublicKey(userPubkey);
  const nonceBytes = new anchor.BN(nonce).toArrayLike(Buffer, 'le', 8);
  const [voucherPda] = await PublicKey.findProgramAddress(
    [Buffer.from('voucher'), userPk.toBuffer(), Buffer.from(nonceBytes)],
    program.programId
  );

  const tx = await program.methods
    .createVoucher(hashBytes, new anchor.BN(nonce))
    .accounts({
      voucher: voucherPda,
      user: userPk,
      authority: backendKeypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([backendKeypair])
    .rpc();

  console.log('[solana.service] createVoucher tx', tx);
  return tx;
}

export async function redeemVoucherOnChain(opts: {
  userPubkey: string;
  voucherPda: PublicKey;
  nonce: number;
  backendKeypair: Keypair;
  programIdString?: string;
}) {
  const { userPubkey, voucherPda, backendKeypair, programIdString } = opts;
  const connection = new anchor.web3.Connection(RPC, 'confirmed');
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });
  const programId = new PublicKey(programIdString || process.env.PROGRAM_ID!);
  const program = new anchor.Program(idl as any, programId, provider);

  const userPk = new PublicKey(userPubkey);
  const tx = await program.methods
    .redeemVoucher()
    .accounts({
      voucher: voucherPda,
      user: userPk,
      authority: backendKeypair.publicKey,
    })
    .signers([backendKeypair])
    .rpc();

  console.log('[solana.service] redeemVoucher tx', tx);
  return tx;
}
