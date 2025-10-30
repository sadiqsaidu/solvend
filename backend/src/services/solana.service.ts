import * as anchor from "@project-serum/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import idl from "../idl/solvend.json"; 

const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

/**
 * Create a voucher on-chain — backend signs
 */
export async function createVoucherOnChain(opts: {
  userPubkey: string;
  hashBytes: number[];
  expiryTs: number;
  isFree: boolean;
  nonce: number;
  backendKeypair: Keypair;
  programIdString?: string;
}) {
  const { userPubkey, hashBytes, expiryTs, isFree, nonce, backendKeypair, programIdString } = opts;

  const connection = new anchor.web3.Connection(RPC, "confirmed");
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const programId = new PublicKey(programIdString || process.env.PROGRAM_ID!);
  const program = new anchor.Program(idl as any, programId, provider);

  const userPk = new PublicKey(userPubkey);
  const nonceBytes = new anchor.BN(nonce).toArrayLike(Buffer, "le", 8);
  const [voucherPda] = await PublicKey.findProgramAddress(
    [Buffer.from("voucher"), userPk.toBuffer(), Buffer.from(nonceBytes)],
    program.programId
  );

  const tx = await program.methods
    .createVoucher(hashBytes, new anchor.BN(expiryTs), isFree, new anchor.BN(nonce))
    .accounts({
      voucher: voucherPda,
      user: userPk,
      authority: backendKeypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([backendKeypair])
    .rpc();

  console.log("[solana.service] createVoucher tx", tx);
  return tx;
}

/**
 * Redeem a voucher on-chain — backend signs
 */
export async function redeemVoucherOnChain(opts: {
  userPubkey: string;
  voucherPda: PublicKey;
  nonce: number;
  backendKeypair: Keypair;
  programIdString?: string;
}) {
  const { userPubkey, voucherPda, backendKeypair, programIdString } = opts;

  const connection = new anchor.web3.Connection(RPC, "confirmed");
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
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

  console.log("[solana.service] redeemVoucher tx", tx);
  return tx;
}

/**
 * getBuyReportAccounts — Backend prepares all PDAs and account addresses
 * for the frontend to build and send the transaction.
 */
export async function getBuyReportAccounts(opts: {
  buyerPubkey: string;
  buyerTokenAccountPubkey: string; // Frontend provides user's USDC ATA
  reportType: number; // 0=Daily, 1=Weekly, 2=Monthly
  timeframeDays: number;
  programIdString?: string;
}) {
  const { buyerPubkey, buyerTokenAccountPubkey, programIdString } = opts;

  const connection = new anchor.web3.Connection(RPC, "confirmed");
  const dummyWallet = new anchor.Wallet(Keypair.generate());
  const provider = new anchor.AnchorProvider(connection, dummyWallet, {
    preflightCommitment: "confirmed",
  });

  const programId = new PublicKey(programIdString || process.env.PROGRAM_ID!);
  const program = new anchor.Program(idl as any, programId, provider);
  const buyerPk = new PublicKey(buyerPubkey);

  // Treasury PDA
  const [treasuryPda] = await PublicKey.findProgramAddress([Buffer.from("treasury")], programId);
  const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
  const reportId = new anchor.BN((treasuryAccount as any).reportCount); // report_id for next report

  // Machine config PDA
  const [machinePda] = await PublicKey.findProgramAddress([Buffer.from("machine")], programId);
  const machineAccount = await program.account.machineConfig.fetch(machinePda);

  // Treasury token PDA
  const [treasuryTokenPda] = await PublicKey.findProgramAddress(
    [Buffer.from("treasury"), Buffer.from("usdtoken")],
    programId
  );

  const buyerTokenAccount = new PublicKey(buyerTokenAccountPubkey);

  // Owner token account
  const ownerTokenAccounts = await connection.getTokenAccountsByOwner(
    (machineAccount as any).owner,
    { mint: new PublicKey(process.env.USDC_MINT!) }
  );
  if (ownerTokenAccounts.value.length === 0) {
    throw new Error("Owner has no USDC token account.");
  }
  const ownerTokenAccount = ownerTokenAccounts.value[0].pubkey;

  // Report PDA
  const [reportPda] = await PublicKey.findProgramAddress(
    [Buffer.from("report"), buyerPk.toBuffer(), reportId.toArrayLike(Buffer, "le", 8)],
    programId
  );

  return {
    reportPda,
    treasuryPda,
    treasuryTokenPda,
    buyerTokenAccount,
    ownerTokenAccount,
    machinePda,
    buyerPk,
    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    systemProgram: anchor.web3.SystemProgram.programId,
    reportId: reportId.toNumber(),
  };
}

/**
 * Attach report data (IPFS CID) — backend signs (authorized action)
 */
export async function attachReportDataOnChain(opts: {
  reportId: number;
  buyerPubkey: string;
  ipfsCid: string;
  backendKeypair: Keypair;
  programIdString?: string;
}) {
  const { reportId, buyerPubkey, ipfsCid, backendKeypair, programIdString } = opts;

  const connection = new anchor.web3.Connection(RPC, "confirmed");
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const programId = new PublicKey(programIdString || process.env.PROGRAM_ID!);
  const program = new anchor.Program(idl as any, programId, provider);
  const buyerPk = new PublicKey(buyerPubkey);

  const [machinePda] = await PublicKey.findProgramAddress([Buffer.from("machine")], programId);

  const [reportPda] = await PublicKey.findProgramAddress(
    [Buffer.from("report"), buyerPk.toBuffer(), new anchor.BN(reportId).toArrayLike(Buffer, "le", 8)],
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

  console.log("[solana.service] attachReportData tx", tx);
  return tx;
}

/**
 * Submit Merkle distribution root — backend signs (authorized action)
 */
export async function submitDistributionRootOnChain(opts: {
  reportId: number;
  buyerPubkey: string;
  merkleRoot: number[];
  backendKeypair: Keypair;
  programIdString?: string;
}) {
  const { reportId, buyerPubkey, merkleRoot, backendKeypair, programIdString } = opts;

  const connection = new anchor.web3.Connection(RPC, "confirmed");
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const programId = new PublicKey(programIdString || process.env.PROGRAM_ID!);
  const program = new anchor.Program(idl as any, programId, provider);
  const buyerPk = new PublicKey(buyerPubkey);

  const [machinePda] = await PublicKey.findProgramAddress([Buffer.from("machine")], programId);

  const [reportPda] = await PublicKey.findProgramAddress(
    [Buffer.from("report"), buyerPk.toBuffer(), new anchor.BN(reportId).toArrayLike(Buffer, "le", 8)],
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

  console.log("[solana.service] submitDistributionRoot tx", tx);
  return tx;
}
