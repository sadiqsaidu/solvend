import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

// Multiple RPC endpoints for fallback
// ⚠️ IMPORTANT: Must match wallet authorization cluster
// For devnet testing (free tokens):
const RPC_ENDPOINTS = [
  "https://api.devnet.solana.com", // Solana official devnet
  "https://rpc.ankr.com/solana_devnet", // Ankr devnet (backup)
  "https://devnet.helius-rpc.com/?api-key=public", // Helius public devnet
];

// For mainnet (real money):
// const RPC_ENDPOINTS = [
//   "https://solana-mainnet.g.alchemy.com/v2/demo",
//   "https://rpc.ankr.com/solana",
//   "https://api.mainnet-beta.solana.com",
// ];

// Use the first endpoint by default
const SOLANA_RPC_URL = RPC_ENDPOINTS[0];

console.log("Using Solana RPC:", SOLANA_RPC_URL);

// Create connection with commitment level and better timeout
export const connection = new Connection(SOLANA_RPC_URL, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60000, // Reduced from 90s to 60s
  disableRetryOnRateLimit: false,
  fetch: (url, options) => {
    // Add custom fetch with logging and timeout
    console.log("📡 RPC Request to:", url);

    // Add timeout to fetch requests (20 seconds for more stability)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn("⏱️  RPC request timeout after 20s");
      controller.abort();
    }, 20000);

    return fetch(url, { ...options, signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          console.warn(`⚠️  RPC returned status ${response.status}`);
        }
        return response;
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error("❌ RPC Fetch error:", error?.message || error);
        throw error;
      });
  },
});

// USDC Token Mint Address
// ⚠️ Must match network: devnet or mainnet
// Devnet USDC (for testing):
const USDC_MINT_ADDRESS = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

// Mainnet USDC (for production):
// const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/**
 * Get SOL balance for a wallet
 */
export const getSOLBalance = async (
  walletPublicKey: string | PublicKey
): Promise<number> => {
  try {
    const publicKey =
      typeof walletPublicKey === "string"
        ? new PublicKey(walletPublicKey)
        : walletPublicKey;

    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error: any) {
    console.error("Error fetching SOL balance:", error?.message || error);

    // Return 0 instead of throwing to prevent app crashes
    return 0;
  }
};

/**
 * Get USDC balance for a wallet
 */
export const getUSDCBalance = async (
  walletPublicKey: string | PublicKey
): Promise<number> => {
  try {
    const publicKey =
      typeof walletPublicKey === "string"
        ? new PublicKey(walletPublicKey)
        : walletPublicKey;
    const usdcMint = new PublicKey(USDC_MINT_ADDRESS);

    // Get associated token account
    const associatedTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Get token account balance
    const balance = await connection.getTokenAccountBalance(
      associatedTokenAccount
    );

    return parseFloat(balance.value.uiAmount?.toString() || "0");
  } catch (error: any) {
    // Token account might not exist if user hasn't received USDC yet
    if (error?.message?.includes("could not find account")) {
      console.log("USDC token account not found - wallet has 0 USDC");
      return 0;
    }

    console.error("Error fetching USDC balance:", error?.message || error);
    return 0;
  }
};

/**
 * Get both SOL and USDC balances
 */
export const getWalletBalances = async (
  walletPublicKey: string | PublicKey
): Promise<{ sol: number; usdc: number }> => {
  try {
    const [sol, usdc] = await Promise.all([
      getSOLBalance(walletPublicKey),
      getUSDCBalance(walletPublicKey),
    ]);

    return { sol, usdc };
  } catch (error) {
    console.error("Error fetching balances:", error);
    return { sol: 0, usdc: 0 };
  }
};
