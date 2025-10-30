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
exports.startPaymentListener = startPaymentListener;
const anchor = __importStar(require("@project-serum/anchor"));
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const js_sha3_1 = require("js-sha3");
const path_1 = __importDefault(require("path"));
const purchase_model_1 = require("../database/models/purchase.model");
const solana_service_1 = require("../services/solana.service");
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const TREASURY_TOKEN_ACCOUNT = process.env.TREASURY_TOKEN_ACCOUNT;
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const BACKEND_WALLET_PATH = process.env.BACKEND_WALLET_PATH || "./keys/backend.json";
const PROGRAM_ID = process.env.PROGRAM_ID;
const POLL_INTERVAL_MS = 10000; // Increased to 10 seconds to avoid rate limiting
function loadWalletKeypair() {
    const kp = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(BACKEND_WALLET_PATH), "utf8"));
    return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(kp));
}
function startPaymentListener() {
    const connection = new web3_js_1.Connection(RPC, "confirmed");
    const treasuryPubkey = new web3_js_1.PublicKey(TREASURY_TOKEN_ACCOUNT);
    const backendKeypair = loadWalletKeypair();
    const seen = new Set();
    console.log("[listener] Watching treasury:", treasuryPubkey.toBase58());
    setInterval(async () => {
        try {
            const signatures = await connection.getSignaturesForAddress(treasuryPubkey, { limit: 20 });
            for (const sigInfo of signatures.reverse()) {
                if (seen.has(sigInfo.signature))
                    continue;
                seen.add(sigInfo.signature);
                const tx = await connection.getParsedTransaction(sigInfo.signature, {
                    maxSupportedTransactionVersion: 0,
                });
                if (!tx || tx.meta?.err)
                    continue;
                const instructions = tx.transaction.message.instructions;
                // --- find memo instruction ---
                let referenceId = null;
                for (const ix of instructions) {
                    const programId = "programId" in ix ? ix.programId.toString() : ix.program;
                    if (programId === MEMO_PROGRAM_ID) {
                        const data = ix.parsed?.info?.memo ?? ix.data ?? null;
                        if (typeof data === "string")
                            referenceId = data;
                        else if (data)
                            referenceId = Buffer.from(data).toString("utf8");
                        break;
                    }
                }
                const payerRaw = tx.transaction.message.accountKeys.find((k) => k.signer)?.pubkey;
                // normalize payer to a pubkey string
                const payer = typeof payerRaw === "string"
                    ? payerRaw
                    : payerRaw?.toString
                        ? payerRaw.toString()
                        : null;
                if (!referenceId || !payer)
                    continue;
                const purchase = await purchase_model_1.Purchase.findOne({
                    referenceId,
                    status: "PENDING",
                });
                if (!purchase)
                    continue;
                const otp = Math.floor(1000 + Math.random() * 9000).toString();
                const otpHashHex = (0, js_sha3_1.keccak256)(otp);
                const otpHashBytes = Buffer.from(otpHashHex, "hex");
                purchase.otp = otp; // Store plain OTP for development
                purchase.otpHash = otpHashHex;
                purchase.otpExpiry = new Date(Date.now() + 60 * 60 * 1000);
                purchase.userWallet = payer;
                await purchase.save();
                const nonce = Date.now();
                try {
                    // expiry_ts in seconds and is_free flag (false by default)
                    const expiryTs = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour expiry
                    const isFree = false;
                    await (0, solana_service_1.createVoucherOnChain)({
                        userPubkey: payer,
                        hashBytes: Array.from(otpHashBytes),
                        expiryTs,
                        isFree,
                        nonce,
                        backendKeypair,
                        programIdString: PROGRAM_ID,
                    });
                    purchase.status = "VOUCHER_CREATED";
                    purchase.nonce = nonce;
                    await purchase.save();
                    console.log(`[listener] Voucher created for ${referenceId}, OTP=${otp}`);
                }
                catch (err) {
                    console.error("[listener] createVoucher failed", err);
                    purchase.status = "PENDING"; // fallback
                    await purchase.save();
                }
            }
        }
        catch (err) {
            console.error("[listener] poll error", err);
        }
    }, POLL_INTERVAL_MS);
}
