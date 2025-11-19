/**
 * Example: How to Use Solvend API in Your Components
 *
 * This file demonstrates how to integrate the Solvend API
 * into your React Native components for drink purchases.
 */

import { SolvendAPI } from "@/utils/solvend API";
import { Alert } from "react-native";

/**
 * EXAMPLE 1: Create Purchase and Get Payment Instructions
 */
export async function createDrinkPurchase(
  walletAddress: string,
  drinkPrice: number // Price in USDC (e.g., 0.0001)
) {
  try {
    // Convert USDC to micro-USDC (smallest unit)
    // 1 USDC = 1,000,000 micro-USDC
    const amountInMicroUSDC = Math.round(drinkPrice * 1_000_000);

    // Call backend to create purchase
    const purchase = await SolvendAPI.Purchase.createPurchase({
      userWallet: walletAddress,
      amount: amountInMicroUSDC,
    });

    console.log("Purchase created:", purchase);

    // Returns:
    // {
    //   referenceId: "uuid-1234",
    //   treasuryTokenAccount: "Treasury_Wallet_Address",
    //   amount: 100,
    //   memo: "uuid-1234"
    // }

    return purchase;
  } catch (error) {
    console.error("Failed to create purchase:", error);
    Alert.alert("Error", "Failed to create purchase. Please try again.");
    throw error;
  }
}

/**
 * EXAMPLE 2: Validate OTP After Payment
 */
export async function validatePurchaseOTP(otp: string) {
  try {
    const result = await SolvendAPI.Purchase.validateOtp({ otp });

    if (result.success) {
      console.log("OTP validated! Transaction:", result.tx);
      Alert.alert(
        "Success! 🎉",
        "Your purchase has been verified. Enjoy your drink!",
        [{ text: "OK" }]
      );
      return result.tx;
    } else {
      Alert.alert("Invalid OTP", result.error || "Please try again.");
      return null;
    }
  } catch (error) {
    console.error("OTP validation error:", error);
    Alert.alert("Error", "Failed to validate OTP. Please try again.");
    return null;
  }
}

/**
 * EXAMPLE 3: Get User's Claimable Earnings
 */
export async function getUserClaimProof(walletAddress: string) {
  try {
    const proof = await SolvendAPI.Claims.getClaimProof(walletAddress);

    console.log("Claim proof retrieved:", proof);
    // Returns:
    // {
    //   root: "0x...",
    //   amount: "1000000",
    //   proof: ["hex1", "hex2", ...]
    // }

    return proof;
  } catch (error) {
    console.error("Failed to get claim proof:", error);
    // This is expected if user has no earnings yet
    return null;
  }
}

/**
 * EXAMPLE 4: Complete Purchase Flow Integration
 *
 * Use this in your index.tsx when user buys a drink
 */
export async function completePurchaseFlow(
  walletAddress: string,
  drinkPrice: number,
  drinkName: string,
  // Your existing payment function
  sendPayment: (
    treasury: string,
    amount: number,
    memo: string
  ) => Promise<string>
) {
  try {
    // Step 1: Create purchase in backend
    console.log("Step 1: Creating purchase...");
    const purchase = await createDrinkPurchase(walletAddress, drinkPrice);

    // Step 2: Send Solana payment with memo
    console.log("Step 2: Sending payment...");
    const txSignature = await sendPayment(
      purchase.treasuryTokenAccount,
      drinkPrice,
      purchase.referenceId // Important: Include as memo!
    );

    console.log("Payment sent:", txSignature);
    Alert.alert(
      "Payment Sent! ✅",
      `Payment successful for ${drinkName}. You will receive an OTP shortly.`,
      [{ text: "OK" }]
    );

    // Step 3: Backend automatically detects payment and creates voucher
    // Step 4: User receives OTP (via notification or check backend logs)
    // Step 5: User enters OTP to redeem voucher

    return {
      success: true,
      referenceId: purchase.referenceId,
      txSignature,
    };
  } catch (error: any) {
    console.error("Purchase flow error:", error);
    Alert.alert("Purchase Failed", error.message || "Please try again.");
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export all helper functions
export default {
  createDrinkPurchase,
  validatePurchaseOTP,
  getUserClaimProof,
  completePurchaseFlow,
};
