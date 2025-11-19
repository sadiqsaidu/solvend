/**
 * Solvend Backend API Integration
 *
 * This service provides integration with the Solvend backend API
 * for managing vending machine purchases, vouchers, and reports.
 *
 * API Documentation: https://github.com/sadiqsaidu/solvend
 *
 * Base Endpoints:
 * - Purchase: /api/purchase/*
 * - Claims: /api/claim-proof/:claimant
 * - Reports: /api/report/*
 * - Admin: /api/admin/* (requires authentication)
 */

// Configure your backend API URL here
// For development: http://localhost:3000/api
// For production: https://your-backend-domain.com/api
const SOLVEND_API_BASE_URL =
  process.env.EXPO_PUBLIC_SOLVEND_API_URL || "http://localhost:3000/api";

console.log("Solvend API URL:", SOLVEND_API_BASE_URL);

/**
 * Purchase Models
 */
export interface CreatePurchaseRequest {
  userWallet: string; // User's Solana wallet address
  amount: number; // Amount in smallest units (e.g., lamports for SOL, micro-USDC for USDC)
}

export interface CreatePurchaseResponse {
  referenceId: string; // Unique purchase reference ID
  treasuryTokenAccount: string; // Treasury wallet to send payment to
  amount: number; // Payment amount
  memo: string; // Payment memo (same as referenceId)
}

export interface ValidateOtpRequest {
  otp: string; // 4-digit OTP from user
}

export interface ValidateOtpResponse {
  success: boolean;
  tx?: string; // Transaction signature if successful
  error?: string;
}

export interface PurchaseStatusResponse {
  status: "PENDING" | "VOUCHER_CREATED" | "REDEEMED" | "EXPIRED";
  otp: string | null;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Claims Models
 */
export interface ClaimProofResponse {
  root: string; // Merkle root
  amount: string; // Claimable amount
  proof: string[]; // Merkle proof array
}

/**
 * Purchase API
 */
export class SolvendPurchaseAPI {
  /**
   * Create a new purchase
   *
   * Flow:
   * 1. Call this endpoint to initiate purchase
   * 2. User sends USDC to treasuryTokenAccount with memo = referenceId
   * 3. Backend listens for payment and creates voucher automatically
   * 4. User receives OTP via notification
   * 5. User validates OTP at vending machine
   */
  static async createPurchase(
    request: CreatePurchaseRequest
  ): Promise<CreatePurchaseResponse> {
    try {
      console.log("🔄 Creating purchase with request:", request);
      console.log("📍 API URL:", `${SOLVEND_API_BASE_URL}/purchase/create`);

      // Add timeout to prevent hanging (increased to 30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("⏱️ Timeout reached, aborting request");
        controller.abort();
      }, 30000); // 30 second timeout

      console.log("🚀 Sending fetch request...");
      const response = await fetch(`${SOLVEND_API_BASE_URL}/purchase/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("✅ Got response from backend:", response.status);

      if (!response.ok) {
        console.error("❌ Response not OK, status:", response.status);
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error || "Failed to create purchase");
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }

      const result = await response.json();
      console.log("✅ Purchase created successfully:", result);
      return result;
    } catch (error: any) {
      console.error("❌ Create purchase error:", error);
      console.error("❌ Error message:", error?.message);
      console.error("❌ Error type:", error?.constructor?.name);

      // Check if it's a timeout
      if (error?.message === "Aborted") {
        console.error("⏱️ Request timed out - backend not responding in time");
        console.error("   This could be due to:");
        console.error("   1. Firewall blocking the connection");
        console.error("   2. Backend not running");
        console.error("   3. Backend on wrong IP/port");
      }
      throw error;
    }
  }

  /**
   * Validate OTP and redeem voucher
   *
   * This endpoint:
   * - Validates the OTP against stored hash
   * - Checks if OTP is expired
   * - Redeems voucher on-chain
   * - Marks purchase as REDEEMED
   */
  static async validateOtp(
    request: ValidateOtpRequest
  ): Promise<ValidateOtpResponse> {
    try {
      const response = await fetch(`${SOLVEND_API_BASE_URL}/validate-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || "Failed to validate OTP",
        };
      }

      return await response.json();
    } catch (error: any) {
      console.error("Validate OTP error:", error);
      return {
        success: false,
        error: error.message || "Network error",
      };
    }
  }

  /**
   * Get purchase status and OTP
   *
   * This endpoint:
   * - Returns purchase status (PENDING, VOUCHER_CREATED, REDEEMED, EXPIRED)
   * - Returns OTP if voucher has been created
   * - Used for polling after payment to retrieve OTP
   */
  static async getPurchaseStatus(
    referenceId: string
  ): Promise<PurchaseStatusResponse> {
    try {
      const response = await fetch(
        `${SOLVEND_API_BASE_URL}/purchase/status/${referenceId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get purchase status");
      }

      return await response.json();
    } catch (error: any) {
      console.error("Get purchase status error:", error);
      throw error;
    }
  }

  /**
   * Confirm payment and generate OTP immediately
   *
   * This endpoint:
   * - Confirms a payment with transaction signature
   * - Generates OTP immediately without waiting for blockchain listener
   * - Creates voucher on-chain
   * - Returns OTP in response
   */
  static async confirmPayment(
    referenceId: string,
    transactionSignature: string
  ): Promise<{
    success: boolean;
    status: string;
    otp: string;
    message: string;
  }> {
    try {
      console.log("🔄 Confirming payment:", {
        referenceId,
        transactionSignature,
      });

      const response = await fetch(`${SOLVEND_API_BASE_URL}/purchase/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ referenceId, transactionSignature }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to confirm payment");
      }

      const result = await response.json();
      console.log("✅ Payment confirmed:", result);
      return result;
    } catch (error: any) {
      console.error("Confirm payment error:", error);
      throw error;
    }
  }
}

/**
 * Claims API
 */
export class SolvendClaimsAPI {
  /**
   * Get Merkle proof for earnings claims
   *
   * Users can claim their earnings using the returned Merkle proof.
   * The proof verifies that the user is entitled to the specified amount.
   */
  static async getClaimProof(
    claimantWallet: string
  ): Promise<ClaimProofResponse> {
    try {
      const response = await fetch(
        `${SOLVEND_API_BASE_URL}/claim-proof/${claimantWallet}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get claim proof");
      }

      return await response.json();
    } catch (error: any) {
      console.error("Get claim proof error:", error);
      throw error;
    }
  }
}

/**
 * Database Models (for reference)
 */

export interface IPurchase {
  referenceId: string;
  transactionSignature?: string;
  userWallet: string;
  amount?: number;
  otpHash?: string;
  otpExpiry?: Date;
  nonce?: number;
  status: "PENDING" | "VOUCHER_CREATED" | "REDEEMED" | "EXPIRED";
  createdAt: Date;
  updatedAt: Date;
}

// Export all APIs as a single object for convenience
export const SolvendAPI = {
  Purchase: SolvendPurchaseAPI,
  Claims: SolvendClaimsAPI,
};

export default SolvendAPI;
