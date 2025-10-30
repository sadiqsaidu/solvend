import * as anchor from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Request, Response } from "express";
import fs from "fs";
import { keccak256 } from "js-sha3";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Purchase } from "../../database/models/purchase.model";
import { redeemVoucherOnChain } from "../../services/solana.service";

const BACKEND_WALLET_PATH =
  process.env.BACKEND_WALLET_PATH || "./keys/backend.json";

function loadWalletKeypair(): Keypair {
  const kp = JSON.parse(
    fs.readFileSync(path.resolve(BACKEND_WALLET_PATH), "utf8")
  );
  return Keypair.fromSecretKey(Uint8Array.from(kp));
}

export async function validateOtpHandler(req: Request, res: Response) {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: "OTP required" });

    const otpHashHex = keccak256(otp);
    const purchase = await Purchase.findOne({ otpHash: otpHashHex });
    if (!purchase) return res.status(404).json({ error: "Invalid OTP" });

    if (purchase.otpExpiry && new Date() > purchase.otpExpiry)
      return res.status(400).json({ error: "OTP expired" });

    // Allow both VOUCHER_CREATED and PENDING status (in case voucher creation is delayed)
    if (purchase.status !== "VOUCHER_CREATED" && purchase.status !== "PENDING")
      return res.status(400).json({ error: "Invalid purchase status" });

    if (!purchase.userWallet)
      return res.status(500).json({ error: "Missing userWallet" });

    const backendKeypair = loadWalletKeypair();
    const userPk = new PublicKey(purchase.userWallet);
    const programId = new PublicKey(process.env.PROGRAM_ID!);

    // If voucher hasn't been created yet, create it now
    if (purchase.status === "PENDING") {
      console.log("[validateOtp] Voucher not created yet, creating now...");
      const otpHashBytes = Buffer.from(purchase.otpHash!, "hex");
      const nonce = Date.now();
      const expiryTs = Math.floor(
        (purchase.otpExpiry?.getTime() || Date.now() + 3600000) / 1000
      );
      const isFree = false;

      try {
        const { createVoucherOnChain } = await import(
          "../../services/solana.service"
        );

        await createVoucherOnChain({
          userPubkey: purchase.userWallet,
          hashBytes: otpHashBytes,
          expiryTs,
          isFree,
          nonce,
          backendKeypair,
          programIdString: process.env.PROGRAM_ID!,
        });

        purchase.status = "VOUCHER_CREATED";
        purchase.nonce = nonce;
        await purchase.save();

        console.log("[validateOtp] Voucher created successfully");
      } catch (voucherErr) {
        console.error("[validateOtp] Failed to create voucher:", voucherErr);
        return res
          .status(500)
          .json({ error: "Failed to create voucher on-chain" });
      }
    }

    if (!purchase.nonce)
      return res.status(500).json({ error: "Missing nonce" });

    const nonceBytes = new anchor.BN(purchase.nonce).toArrayLike(
      Buffer,
      "le",
      8
    );
    const [voucherPda] = await PublicKey.findProgramAddress(
      [Buffer.from("voucher"), userPk.toBuffer(), Buffer.from(nonceBytes)],
      programId
    );

    const tx = await redeemVoucherOnChain({
      userPubkey: userPk.toBase58(),
      voucherPda,
      nonce: purchase.nonce,
      backendKeypair,
      programIdString: process.env.PROGRAM_ID!,
    });

    purchase.status = "REDEEMED";
    await purchase.save();

    return res.json({ success: true, tx });
  } catch (err) {
    console.error("[validateOtpHandler]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createPurchaseHandler(req: Request, res: Response) {
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
    const referenceId = uuidv4();

    // Create purchase record in database
    const purchase = new Purchase({
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
  } catch (err) {
    console.error("[createPurchaseHandler]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPurchaseStatusHandler(req: Request, res: Response) {
  try {
    const { referenceId } = req.params;

    if (!referenceId) {
      return res.status(400).json({ error: "referenceId is required" });
    }

    const purchase = await Purchase.findOne({ referenceId });
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
  } catch (err) {
    console.error("[getPurchaseStatusHandler]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function confirmPaymentHandler(req: Request, res: Response) {
  try {
    const { referenceId, transactionSignature } = req.body;

    if (!referenceId || !transactionSignature) {
      return res
        .status(400)
        .json({ error: "referenceId and transactionSignature are required" });
    }

    console.log(
      `[confirmPayment] Processing payment for ${referenceId}, tx: ${transactionSignature}`
    );

    const purchase = await Purchase.findOne({ referenceId, status: "PENDING" });
    if (!purchase) {
      return res
        .status(404)
        .json({ error: "Purchase not found or already processed" });
    }

    // Generate OTP immediately
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpHashHex = keccak256(otp);
    const otpHashBytes = Buffer.from(otpHashHex, "hex");

    purchase.transactionSignature = transactionSignature;
    purchase.otp = otp;
    purchase.otpHash = otpHashHex;
    purchase.otpExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await purchase.save();

    console.log(`[confirmPayment] OTP generated: ${otp}`);

    // Create voucher on-chain
    const backendKeypair = loadWalletKeypair();
    const programId = new PublicKey(process.env.PROGRAM_ID!);
    const nonce = Date.now();

    try {
      const expiryTs = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
      const isFree = false;

      const { createVoucherOnChain } = await import(
        "../../services/solana.service"
      );

      await createVoucherOnChain({
        userPubkey: purchase.userWallet,
        hashBytes: otpHashBytes,
        expiryTs,
        isFree,
        nonce,
        backendKeypair,
        programIdString: process.env.PROGRAM_ID!,
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
    } catch (err) {
      console.error("[confirmPayment] Voucher creation failed:", err);
      // Still return OTP even if voucher creation fails
      return res.json({
        success: true,
        status: "PENDING",
        otp: otp,
        message: "Payment received, voucher creation in progress",
      });
    }
  } catch (err) {
    console.error("[confirmPaymentHandler]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
