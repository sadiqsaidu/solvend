import { Request, Response } from 'express';
import { keccak256 } from 'js-sha3';
import { Purchase } from '../../database/models/purchase.model';
import { redeemAndIncrement } from '../../services/solana.service';
import { PublicKey } from '@solana/web3.js';

export async function validateOtpHandler(req: Request, res: Response) {
  const { otp } = req.body;

  if (!otp || typeof otp !== 'string' || otp.length !== 4) {
    return res.status(400).json({ message: "Invalid OTP format" });
  }

  try {
    // 1. Hash the incoming OTP to find it in the database.
    const otpHash = keccak256(otp);

    // 2. Find the purchase record.
    const purchase = await Purchase.findOne({
      otpHash: otpHash,
      status: 'VOUCHER_CREATED',
      otpExpiry: { $gt: new Date() }, // Check that it has not expired.
    });

    if (!purchase) {
      return res.status(404).json({ message: "Invalid or expired OTP" });
    }

    // 3. If valid, call the on-chain instructions.
    // We assume the user's opt-in status is known or can be fetched.
    const userOptIn = true; // Placeholder
    
    if (!purchase.nonce) {
      return res.status(400).json({ message: "Purchase nonce not found" });
    }
    
    await redeemAndIncrement(new PublicKey(purchase.userWallet), purchase.nonce, userOptIn);

    // 4. Update the database.
    purchase.status = 'REDEEMED';
    await purchase.save();
    
    // 5. Respond with success to the vending machine.
    return res.status(200).json({ message: "Success", dispense: true });

  } catch (error) {
    console.error("Error validating OTP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}