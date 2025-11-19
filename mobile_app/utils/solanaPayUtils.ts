import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { connection } from "./solanaUtils";

const SOLVEND_API_BASE_URL =
  process.env.EXPO_PUBLIC_SOLVEND_API_URL || "http://localhost:3000/api";

// Memo Program ID (Solana's SPL Memo Program)
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

// Alternative RPC endpoints for fallback
// ⚠️ Must match network (devnet or mainnet)
const FALLBACK_RPC_ENDPOINTS = [
  "https://api.devnet.solana.com",
  "https://rpc.ankr.com/solana_devnet",
  "https://devnet.helius-rpc.com/?api-key=public",
  "https://solana-devnet.g.alchemy.com/v2/demo",
];

// For mainnet:
// const FALLBACK_RPC_ENDPOINTS = [
//   "https://solana-mainnet.g.alchemy.com/v2/demo",
//   "https://rpc.ankr.com/solana",
//   "https://api.mainnet-beta.solana.com",
// ];

async function fetchBlockhashFromBackend(): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
} | null> {
  try {
    console.log("🛰️ Requesting blockhash from backend...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn("⏱️ Backend blockhash request timed out after 10s");
      controller.abort();
    }, 10000);

    const response = await fetch(
      `${SOLVEND_API_BASE_URL}/solana/latest-blockhash`,
      {
        method: "GET",
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      console.warn(
        "⚠️ Backend blockhash request failed:",
        response.status,
        text
      );
      return null;
    }

    const data = (await response.json()) as {
      blockhash: string;
      lastValidBlockHeight: number;
    };
    console.log("✅ Received blockhash from backend");
    return data;
  } catch (error: any) {
    console.warn(
      "⚠️ Unable to get blockhash from backend:",
      error?.message || error
    );
    return null;
  }
}

/**
 * Try to get blockhash from multiple RPC endpoints
 */
async function getBlockhashWithFallback(): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  console.log("🔗 Starting blockhash retrieval with fallback...");

  // Skip backend proxy for now - not implemented yet
  // const backendBlockhash = await fetchBlockhashFromBackend();
  // if (backendBlockhash) {
  //   return backendBlockhash;
  // }

  // Try primary connection first with timeout
  try {
    console.log("📍 Trying primary RPC endpoint...");
    const blockInfoPromise = connection.getLatestBlockhash("confirmed");
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Primary RPC timeout")), 15000)
    );
    const blockInfo = await Promise.race([blockInfoPromise, timeoutPromise]);
    console.log("✅ Primary RPC successful");
    return blockInfo as any;
  } catch (primaryError) {
    console.warn("❌ Primary RPC failed:", primaryError);
  }

  // Try fallback endpoints
  for (let i = 0; i < FALLBACK_RPC_ENDPOINTS.length; i++) {
    try {
      const endpoint = FALLBACK_RPC_ENDPOINTS[i];
      console.log(
        `📍 Trying fallback RPC ${i + 1}/${FALLBACK_RPC_ENDPOINTS.length}: ${endpoint}`
      );

      const fallbackConnection = new Connection(endpoint, {
        commitment: "confirmed",
        confirmTransactionInitialTimeout: 60000,
        disableRetryOnRateLimit: false,
      });

      // Add timeout to fallback attempts
      const blockInfoPromise =
        fallbackConnection.getLatestBlockhash("confirmed");
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Fallback RPC ${i + 1} timeout`)),
          15000
        )
      );
      const blockInfo = await Promise.race([blockInfoPromise, timeoutPromise]);

      console.log(`✅ Fallback RPC ${i + 1} successful`);
      return blockInfo as any;
    } catch (error: any) {
      console.warn(`❌ Fallback RPC ${i + 1} failed:`, error?.message || error);

      // If this was the last endpoint, throw error
      if (i === FALLBACK_RPC_ENDPOINTS.length - 1) {
        const errorMsg =
          "Unable to connect to Solana network. Please check your internet connection and try again.";
        console.error("🚨 All RPC endpoints exhausted:", errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  throw new Error("All RPC endpoints failed");
}

// Merchant wallet address (replace with your actual merchant wallet)
// For testing: sending to yourself to verify transaction works
// TODO: Replace with your actual merchant wallet for production
const MERCHANT_WALLET = "5ReMQrivJK31UuvNpjF5Qt8fiABxY4oRbwVwZHYdp7PD";

// USDC Token Mint Address
// ⚠️ Must match network: devnet or mainnet
// Devnet USDC (for testing):
const USDC_MINT_ADDRESS = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

// Mainnet USDC (for production):
// const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/**
 * Create a Solana Pay transaction for SOL payment
 */
export async function createSOLPaymentTransaction(
  senderPublicKey: PublicKey,
  amountSOL: number,
  reference?: PublicKey
): Promise<Transaction> {
  try {
    const merchantPublicKey = new PublicKey(MERCHANT_WALLET);
    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

    const transaction = new Transaction();

    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: merchantPublicKey,
        lamports,
      })
    );

    // Add reference if provided (for tracking)
    if (reference) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: reference,
          lamports: 0, // Zero amount, just for reference
        })
      );
    }

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = senderPublicKey;

    return transaction;
  } catch (error) {
    console.error("Error creating SOL payment transaction:", error);
    throw error;
  }
}

/**
 * Create a Solana Pay transaction for USDC payment
 */
export async function createUSDCPaymentTransaction(
  senderPublicKey: PublicKey,
  amountUSDC: number,
  memo?: string
): Promise<Transaction> {
  try {
    console.log("Creating USDC payment transaction...");
    console.log("Sender:", senderPublicKey.toBase58());
    console.log("Amount USDC:", amountUSDC);
    if (memo) console.log("Memo:", memo);

    const merchantPublicKey = new PublicKey(MERCHANT_WALLET);
    console.log("Merchant:", merchantPublicKey.toBase58());

    const usdcMint = new PublicKey(USDC_MINT_ADDRESS);

    // Get sender's USDC token account
    const senderTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      senderPublicKey
    );
    console.log("Sender token account:", senderTokenAccount.toBase58());

    // Get merchant's USDC token account
    const merchantTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      merchantPublicKey
    );
    console.log("Merchant token account:", merchantTokenAccount.toBase58());

    // Convert USDC amount to smallest unit (6 decimals)
    const amount = Math.floor(amountUSDC * 1_000_000);
    console.log("Amount in smallest units:", amount);

    const transaction = new Transaction();

    // Add USDC transfer instruction
    transaction.add(
      createTransferInstruction(
        senderTokenAccount,
        merchantTokenAccount,
        senderPublicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Add memo instruction if provided (for Solvend reference tracking)
    if (memo) {
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, "utf-8"),
      });
      transaction.add(memoInstruction);
      console.log("Memo instruction added to transaction");
    }

    // Get recent blockhash with automatic fallback to alternative RPC endpoints
    console.log("Fetching recent blockhash...");
    const { blockhash, lastValidBlockHeight } =
      await getBlockhashWithFallback();
    console.log("Blockhash obtained:", blockhash);

    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = senderPublicKey;

    return transaction;
  } catch (error) {
    console.error("Error creating USDC payment transaction:", error);
    throw error;
  }
}

/**
 * Verify transaction confirmation
 */
export async function confirmTransaction(
  signature: string,
  maxRetries = 30
): Promise<boolean> {
  try {
    let retries = 0;

    while (retries < maxRetries) {
      const status = await connection.getSignatureStatus(signature);

      if (
        status?.value?.confirmationStatus === "confirmed" ||
        status?.value?.confirmationStatus === "finalized"
      ) {
        return true;
      }

      if (status?.value?.err) {
        console.error("Transaction failed:", status.value.err);
        return false;
      }

      // Wait 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
    }

    console.error("Transaction confirmation timeout");
    return false;
  } catch (error) {
    console.error("Error confirming transaction:", error);
    return false;
  }
}

/**
 * Generate a unique reference PublicKey for tracking transactions
 */
export function generateReference(): PublicKey {
  return PublicKey.unique();
}

/**
 * Find transaction by reference
 */
export async function findTransactionByReference(
  reference: PublicKey,
  options?: {
    until?: string;
    limit?: number;
  }
): Promise<string | null> {
  try {
    const signatures = await connection.getSignaturesForAddress(
      reference,
      options
    );

    if (signatures.length > 0) {
      return signatures[0].signature;
    }

    return null;
  } catch (error) {
    console.error("Error finding transaction:", error);
    return null;
  }
}

/**
 * Get transaction details
 */
export async function getTransactionDetails(signature: string) {
  try {
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    return transaction;
  } catch (error) {
    console.error("Error getting transaction details:", error);
    return null;
  }
}

/**
 * Format amount for display
 */
export function formatCryptoAmount(amount: number, decimals: number): string {
  return amount.toFixed(decimals);
}

/**
 * Calculate transaction fee estimate
 */
export async function estimateTransactionFee(
  transaction: Transaction
): Promise<number> {
  try {
    const fee = await connection.getFeeForMessage(
      transaction.compileMessage(),
      "confirmed"
    );

    return fee.value ? fee.value / LAMPORTS_PER_SOL : 0.000005; // Default estimate
  } catch (error) {
    console.error("Error estimating fee:", error);
    return 0.000005; // Default estimate
  }
}
