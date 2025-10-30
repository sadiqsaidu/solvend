"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVoucherOnChain = createVoucherOnChain;
exports.redeemVoucherOnChain = redeemVoucherOnChain;
exports.getBuyReportAccounts = getBuyReportAccounts;
exports.attachReportDataOnChain = attachReportDataOnChain;
exports.submitDistributionRootOnChain = submitDistributionRootOnChain;
const anchor = __importStar(require("@project-serum/anchor"));
const web3_js_1 = require("@solana/web3.js");
const solvend_json_1 = __importDefault(require("../idl/solvend.json"));
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
/**
 * Create a voucher on-chain — backend signs
 */
async function createVoucherOnChain(opts) {
    const { userPubkey, hashBytes, expiryTs, isFree, nonce, backendKeypair, programIdString } = opts;
    const connection = new anchor.web3.Connection(RPC, "confirmed");
    const wallet = new anchor.Wallet(backendKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        preflightCommitment: "confirmed",
    });
    const programId = new web3_js_1.PublicKey(programIdString || process.env.PROGRAM_ID);
    const program = new anchor.Program(solvend_json_1.default, programId, provider);
    const userPk = new web3_js_1.PublicKey(userPubkey);
    const nonceBytes = new anchor.BN(nonce).toArrayLike(Buffer, "le", 8);
    const [voucherPda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("voucher"), userPk.toBuffer(), Buffer.from(nonceBytes)], program.programId);
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
async function redeemVoucherOnChain(opts) {
    const { userPubkey, voucherPda, backendKeypair, programIdString } = opts;
    const connection = new anchor.web3.Connection(RPC, "confirmed");
    const wallet = new anchor.Wallet(backendKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        preflightCommitment: "confirmed",
    });
    const programId = new web3_js_1.PublicKey(programIdString || process.env.PROGRAM_ID);
    const program = new anchor.Program(solvend_json_1.default, programId, provider);
    const userPk = new web3_js_1.PublicKey(userPubkey);
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
async function getBuyReportAccounts(opts) {
    const { buyerPubkey, buyerTokenAccountPubkey, programIdString } = opts;
    const connection = new anchor.web3.Connection(RPC, "confirmed");
    const dummyWallet = new anchor.Wallet(web3_js_1.Keypair.generate());
    const provider = new anchor.AnchorProvider(connection, dummyWallet, {
        preflightCommitment: "confirmed",
    });
    const programId = new web3_js_1.PublicKey(programIdString || process.env.PROGRAM_ID);
    const program = new anchor.Program(solvend_json_1.default, programId, provider);
    const buyerPk = new web3_js_1.PublicKey(buyerPubkey);
    // Treasury PDA
    const [treasuryPda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("treasury")], programId);
    const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
    const reportId = new anchor.BN(treasuryAccount.reportCount); // report_id for next report
    // Machine config PDA
    const [machinePda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("machine")], programId);
    const machineAccount = await program.account.machineConfig.fetch(machinePda);
    // Treasury token PDA
    const [treasuryTokenPda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("treasury"), Buffer.from("usdtoken")], programId);
    const buyerTokenAccount = new web3_js_1.PublicKey(buyerTokenAccountPubkey);
    // Owner token account
    const ownerTokenAccounts = await connection.getTokenAccountsByOwner(machineAccount.owner, { mint: new web3_js_1.PublicKey(process.env.USDC_MINT) });
    if (ownerTokenAccounts.value.length === 0) {
        throw new Error("Owner has no USDC token account.");
    }
    const ownerTokenAccount = ownerTokenAccounts.value[0].pubkey;
    // Report PDA
    const [reportPda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("report"), buyerPk.toBuffer(), reportId.toArrayLike(Buffer, "le", 8)], programId);
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
async function attachReportDataOnChain(opts) {
    const { reportId, buyerPubkey, ipfsCid, backendKeypair, programIdString } = opts;
    const connection = new anchor.web3.Connection(RPC, "confirmed");
    const wallet = new anchor.Wallet(backendKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        preflightCommitment: "confirmed",
    });
    const programId = new web3_js_1.PublicKey(programIdString || process.env.PROGRAM_ID);
    const program = new anchor.Program(solvend_json_1.default, programId, provider);
    const buyerPk = new web3_js_1.PublicKey(buyerPubkey);
    const [machinePda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("machine")], programId);
    const [reportPda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("report"), buyerPk.toBuffer(), new anchor.BN(reportId).toArrayLike(Buffer, "le", 8)], programId);
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
async function submitDistributionRootOnChain(opts) {
    const { reportId, buyerPubkey, merkleRoot, backendKeypair, programIdString } = opts;
    const connection = new anchor.web3.Connection(RPC, "confirmed");
    const wallet = new anchor.Wallet(backendKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        preflightCommitment: "confirmed",
    });
    const programId = new web3_js_1.PublicKey(programIdString || process.env.PROGRAM_ID);
    const program = new anchor.Program(solvend_json_1.default, programId, provider);
    const buyerPk = new web3_js_1.PublicKey(buyerPubkey);
    const [machinePda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("machine")], programId);
    const [reportPda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("report"), buyerPk.toBuffer(), new anchor.BN(reportId).toArrayLike(Buffer, "le", 8)], programId);
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
