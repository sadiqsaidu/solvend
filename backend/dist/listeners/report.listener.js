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
exports.startReportListener = startReportListener;
// backend/src/listeners/report.listener.ts
const web3_js_1 = require("@solana/web3.js");
const report_model_1 = require("../database/models/report.model");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const anchor = __importStar(require("@project-serum/anchor"));
const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const TREASURY_TOKEN_ACCOUNT = process.env.TREASURY_TOKEN_ACCOUNT;
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const BACKEND_WALLET_PATH = process.env.BACKEND_WALLET_PATH || './keys/backend.json';
const POLL_INTERVAL_MS = 4000;
function loadWalletKeypair() {
    const kp = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(BACKEND_WALLET_PATH), 'utf8'));
    return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(kp));
}
function startReportListener() {
    const connection = new web3_js_1.Connection(RPC, 'confirmed');
    const treasuryPubkey = new web3_js_1.PublicKey(TREASURY_TOKEN_ACCOUNT);
    const seen = new Set();
    console.log('[report-listener] Watching treasury for report payments:', treasuryPubkey.toBase58());
    setInterval(async () => {
        try {
            const signatures = await connection.getSignaturesForAddress(treasuryPubkey, { limit: 20 });
            for (const sigInfo of signatures.reverse()) {
                if (seen.has(sigInfo.signature))
                    continue;
                seen.add(sigInfo.signature);
                const tx = await connection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0 });
                if (!tx || tx.meta?.err)
                    continue;
                const instructions = tx.transaction.message.instructions;
                // Find memo instruction
                let referenceId = null;
                for (const ix of instructions) {
                    const programId = 'programId' in ix ? ix.programId.toString() : ix.program;
                    if (programId === MEMO_PROGRAM_ID) {
                        const data = ix.parsed?.info?.memo ?? ix.data ?? null;
                        if (typeof data === 'string')
                            referenceId = data;
                        else if (data)
                            referenceId = Buffer.from(data).toString('utf8');
                        break;
                    }
                }
                const payerRaw = tx.transaction.message.accountKeys.find((k) => k.signer)?.pubkey;
                const payer = typeof payerRaw === 'string' ? payerRaw : (payerRaw?.toString ? payerRaw.toString() : null);
                if (!referenceId || !payer)
                    continue;
                // Check if this is a report purchase
                const report = await report_model_1.Report.findOne({ referenceId, status: 'PENDING' });
                if (!report)
                    continue;
                try {
                    // The listener only verifies the payment and updates the DB.
                    report.status = 'PAID';
                    report.transactionSignature = sigInfo.signature;
                    // Warn if payer doesn’t match recorded buyer
                    if (report.buyerWallet !== payer) {
                        console.warn(`[report-listener] Payer ${payer} does not match buyer ${report.buyerWallet} for ${referenceId}. Marking as PAID.`);
                        // Optionally handle mismatch differently if needed
                    }
                    await report.save();
                    console.log(`[report-listener] Report ${report.reportId} (Ref: ${referenceId}) marked as PAID.`);
                }
                catch (err) {
                    console.error('[report-listener] Failed to update report status', err);
                }
            }
        }
        catch (err) {
            console.error('[report-listener] poll error', err);
        }
    }, POLL_INTERVAL_MS);
}
