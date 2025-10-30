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
exports.validateOtpHandler = validateOtpHandler;
exports.createPurchaseHandler = createPurchaseHandler;
exports.getPurchaseStatusHandler = getPurchaseStatusHandler;
exports.confirmPaymentHandler = confirmPaymentHandler;
const anchor = __importStar(require("@project-serum/anchor"));
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const js_sha3_1 = require("js-sha3");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const purchase_model_1 = require("../../database/models/purchase.model");
const solana_service_1 = require("../../services/solana.service");
const BACKEND_WALLET_PATH = process.env.BACKEND_WALLET_PATH || "./keys/backend.json";
function loadWalletKeypair() {
    const kp = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(BACKEND_WALLET_PATH), "utf8"));
    return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(kp));
}
async function validateOtpHandler(req, res) {
    try {
        const { otp } = req.body;
        if (!otp)
            return res.status(400).json({ error: "OTP required" });
        const otpHashHex = (0, js_sha3_1.keccak256)(otp);
        const purchase = await purchase_model_1.Purchase.findOne({ otpHash: otpHashHex });
        if (!purchase)
            return res.status(404).json({ error: "Invalid OTP" });
        if (purchase.otpExpiry && new Date() > purchase.otpExpiry)
            return res.status(400).json({ error: "OTP expired" });
        // Allow both VOUCHER_CREATED and PENDING status (in case voucher creation is delayed)
        if (purchase.status !== "VOUCHER_CREATED" && purchase.status !== "PENDING")
            return res.status(400).json({ error: "Invalid purchase status" });
        if (!purchase.userWallet)
            return res.status(500).json({ error: "Missing userWallet" });
        const backendKeypair = loadWalletKeypair();
        const userPk = new web3_js_1.PublicKey(purchase.userWallet);
        const programId = new web3_js_1.PublicKey(process.env.PROGRAM_ID);
        // If voucher hasn't been created yet, create it now
        if (purchase.status === "PENDING") {
            console.log("[validateOtp] Voucher not created yet, creating now...");
            // FIX #1 — convert Buffer to number[]
            const otpHashBytes = Array.from(Buffer.from(purchase.otpHash, "hex"));
            const nonce = Date.now();
            const expiryTs = Math.floor((purchase.otpExpiry?.getTime() || Date.now() + 3600000) / 1000);
            const isFree = false;
            try {
                const { createVoucherOnChain } = await Promise.resolve().then(() => __importStar(require("../../services/solana.service")));
                await createVoucherOnChain({
                    userPubkey: purchase.userWallet,
                    hashBytes: otpHashBytes,
                    expiryTs,
                    isFree,
                    nonce,
                    backendKeypair,
                    programIdString: process.env.PROGRAM_ID,
                });
                purchase.status = "VOUCHER_CREATED";
                purchase.nonce = nonce;
                await purchase.save();
                console.log("[validateOtp] Voucher created successfully");
            }
            catch (voucherErr) {
                console.error("[validateOtp] Failed to create voucher:", voucherErr);
                return res
                    .status(500)
                    .json({ error: "Failed to create voucher on-chain" });
            }
        }
        if (!purchase.nonce)
            return res.status(500).json({ error: "Missing nonce" });
        const nonceBytes = new anchor.BN(purchase.nonce).toArrayLike(Buffer, "le", 8);
        const [voucherPda] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from("voucher"), userPk.toBuffer(), Buffer.from(nonceBytes)], programId);
        const tx = await (0, solana_service_1.redeemVoucherOnChain)({
            userPubkey: userPk.toBase58(),
            voucherPda,
            nonce: purchase.nonce,
            backendKeypair,
            programIdString: process.env.PROGRAM_ID,
        });
        purchase.status = "REDEEMED";
        await purchase.save();
        return res.json({ success: true, tx });
    }
    catch (err) {
        console.error("[validateOtpHandler]", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
async function createPurchaseHandler(req, res) {
    try {
        const { userWallet, amount } = req.body;
        if (!userWallet || !amount) {
            return res
                .status(400)
                .json({ error: "userWallet and amount are required" });
        }
        if (amount <= 0) {
            return res.status(400).json({ error: "Amount must be positive" });
        }
        // Generate unique reference ID
        const referenceId = (0, uuid_1.v4)();
        // Create purchase record in database
        const purchase = new purchase_model_1.Purchase({
            referenceId,
            userWallet,
            amount,
            status: "PENDING",
        });
        await purchase.save();
        // Return payment information
        const treasuryTokenAccount = process.env.TREASURY_TOKEN_ACCOUNT;
        if (!treasuryTokenAccount) {
            return res
                .status(500)
                .json({ error: "Treasury token account not configured" });
        }
        return res.json({
            referenceId,
            treasuryTokenAccount,
            amount,
            memo: referenceId,
        });
    }
    catch (err) {
        console.error("[createPurchaseHandler]", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
async function getPurchaseStatusHandler(req, res) {
    try {
        const { referenceId } = req.params;
        if (!referenceId) {
            return res.status(400).json({ error: "referenceId is required" });
        }
        const purchase = await purchase_model_1.Purchase.findOne({ referenceId });
        if (!purchase) {
            return res.status(404).json({ error: "Purchase not found" });
        }
        // For development, return plain OTP if available
        // In production, you'd send this via SMS/push notification instead
        return res.json({
            status: purchase.status,
            otp: purchase.otp || null, // Return OTP if available, regardless of status
            createdAt: purchase.createdAt,
            expiresAt: purchase.otpExpiry,
        });
    }
    catch (err) {
        console.error("[getPurchaseStatusHandler]", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
async function confirmPaymentHandler(req, res) {
    try {
        const { referenceId, transactionSignature } = req.body;
        if (!referenceId || !transactionSignature) {
            return res
                .status(400)
                .json({ error: "referenceId and transactionSignature are required" });
        }
        console.log(`[confirmPayment] Processing payment for ${referenceId}, tx: ${transactionSignature}`);
        const purchase = await purchase_model_1.Purchase.findOne({ referenceId, status: "PENDING" });
        if (!purchase) {
            return res
                .status(404)
                .json({ error: "Purchase not found or already processed" });
        }
        // Generate OTP immediately
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const otpHashHex = (0, js_sha3_1.keccak256)(otp);
        // FIX #2 — convert Buffer to number[]
        const otpHashBytes = Array.from(Buffer.from(otpHashHex, "hex"));
        purchase.transactionSignature = transactionSignature;
        purchase.otp = otp;
        purchase.otpHash = otpHashHex;
        purchase.otpExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await purchase.save();
        console.log(`[confirmPayment] OTP generated: ${otp}`);
        // Create voucher on-chain
        const backendKeypair = loadWalletKeypair();
        const programId = new web3_js_1.PublicKey(process.env.PROGRAM_ID);
        const nonce = Date.now();
        try {
            const expiryTs = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
            const isFree = false;
            const { createVoucherOnChain } = await Promise.resolve().then(() => __importStar(require("../../services/solana.service")));
            await createVoucherOnChain({
                userPubkey: purchase.userWallet,
                hashBytes: otpHashBytes,
                expiryTs,
                isFree,
                nonce,
                backendKeypair,
                programIdString: process.env.PROGRAM_ID,
            });
            purchase.status = "VOUCHER_CREATED";
            purchase.nonce = nonce;
            await purchase.save();
            console.log(`[confirmPayment] Voucher created successfully`);
            return res.json({
                success: true,
                status: "VOUCHER_CREATED",
                otp: otp,
                message: "Payment confirmed and voucher created",
            });
        }
        catch (err) {
            console.error("[confirmPayment] Voucher creation failed:", err);
            // Still return OTP even if voucher creation fails
            return res.json({
                success: true,
                status: "PENDING",
                otp: otp,
                message: "Payment received, voucher creation in progress",
            });
        }
    }
    catch (err) {
        console.error("[confirmPaymentHandler]", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
