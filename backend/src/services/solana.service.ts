import * as anchor from '@project-serum/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import idl from '../../../target/idl/solvend.json'; // adjust to your IDL

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

export async function buyReportOnChain(opts: {
  buyerPubkey: string;
  reportType: number; // 0=Daily, 1=Weekly, 2=Monthly
  timeframeDays: number;
  backendKeypair: Keypair;
  programIdString?: string;
}) {
  const { buyerPubkey, reportType, timeframeDays, backendKeypair, programIdString } = opts;
  const connection = new anchor.web3.Connection(RPC, 'confirmed');
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });
  const programId = new PublicKey(programIdString || process.env.PROGRAM_ID!);
  const program = new anchor.Program(idl as any, programId, provider);

  const buyerPk = new PublicKey(buyerPubkey);
  
  // Get treasury account to get current report count
  const [treasuryPda] = await PublicKey.findProgramAddress(
    [Buffer.from('treasury')],
    programId
  );
  
  const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
  const reportId = (treasuryAccount as any).reportCount;

  // Get machine config for owner token account
  const [machinePda] = await PublicKey.findProgramAddress(
    [Buffer.from('machine')],
    programId
  );
  
  const machineAccount = await program.account.machineConfig.fetch(machinePda);
  
  // Get treasury token account
  const [treasuryTokenPda] = await PublicKey.findProgramAddress(
    [Buffer.from('treasury'), Buffer.from('usdtoken')],
    programId
  );

  // Get buyer token account (assuming USDC)
  const buyerTokenAccount = await connection.getTokenAccountsByOwner(buyerPk, {
    mint: new PublicKey(process.env.USDC_MINT!),
  });

  if (buyerTokenAccount.value.length === 0) {
    throw new Error('Buyer has no USDC token account');
  }

  // Get owner token account
  const ownerTokenAccount = await connection.getTokenAccountsByOwner((machineAccount as any).owner, {
    mint: new PublicKey(process.env.USDC_MINT!),
  });

  if (ownerTokenAccount.value.length === 0) {
    throw new Error('Owner has no USDC token account');
  }

  const tx = await program.methods
    .buyReport(reportType, timeframeDays)
    .accounts({
      report: await PublicKey.findProgramAddress(
        [Buffer.from('report'), buyerPk.toBuffer(), Buffer.from(reportId.toString().padStart(8, '0'), 'hex')],
        programId
      ).then(([pda]) => pda),
      treasury: treasuryPda,
      treasuryTokenAccount: treasuryTokenPda,
      buyerTokenAccount: buyerTokenAccount.value[0].pubkey,
      ownerTokenAccount: ownerTokenAccount.value[0].pubkey,
      machineConfig: machinePda,
      buyer: buyerPk,
    })
    .signers([backendKeypair])
    .rpc();

  console.log('[solana.service] buyReport tx', tx);
  return tx;
}

export async function attachReportDataOnChain(opts: {
  reportId: number;
  buyerPubkey: string;
  ipfsCid: string;
  backendKeypair: Keypair;
  programIdString?: string;
}) {
  const { reportId, buyerPubkey, ipfsCid, backendKeypair, programIdString } = opts;
  const connection = new anchor.web3.Connection(RPC, 'confirmed');
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });
  const programId = new PublicKey(programIdString || process.env.PROGRAM_ID!);
  const program = new anchor.Program(idl as any, programId, provider);

  const buyerPk = new PublicKey(buyerPubkey);
  
  // Get machine config
  const [machinePda] = await PublicKey.findProgramAddress(
    [Buffer.from('machine')],
    programId
  );

  // Get report PDA
  const [reportPda] = await PublicKey.findProgramAddress(
    [Buffer.from('report'), buyerPk.toBuffer(), Buffer.from(reportId.toString().padStart(8, '0'), 'hex')],
    programId
  );

  const tx = await program.methods
    .attachReportData(ipfsCid)
    .accounts({
      report: reportPda,
      buyer: buyerPk,
      authority: backendKeypair.publicKey,
      machineConfig: machinePda,
    })
    .signers([backendKeypair])
    .rpc();

  console.log('[solana.service] attachReportData tx', tx);
  return tx;
}

export async function submitDistributionRootOnChain(opts: {
  reportId: number;
  buyerPubkey: string;
  merkleRoot: number[];
  backendKeypair: Keypair;
  programIdString?: string;
}) {
  const { reportId, buyerPubkey, merkleRoot, backendKeypair, programIdString } = opts;
  const connection = new anchor.web3.Connection(RPC, 'confirmed');
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });
  const programId = new PublicKey(programIdString || process.env.PROGRAM_ID!);
  const program = new anchor.Program(idl as any, programId, provider);

  const buyerPk = new PublicKey(buyerPubkey);
  
  // Get machine config
  const [machinePda] = await PublicKey.findProgramAddress(
    [Buffer.from('machine')],
    programId
  );

  // Get report PDA
  const [reportPda] = await PublicKey.findProgramAddress(
    [Buffer.from('report'), buyerPk.toBuffer(), Buffer.from(reportId.toString().padStart(8, '0'), 'hex')],
    programId
  );

  const tx = await program.methods
    .submitDistributionRoot(merkleRoot)
    .accounts({
      report: reportPda,
      buyer: buyerPk,
      authority: backendKeypair.publicKey,
      machineConfig: machinePda,
    })
    .signers([backendKeypair])
    .rpc();

  console.log('[solana.service] submitDistributionRoot tx', tx);
  return tx;
}
