// Script to create USDC token account and get devnet USDC
// Run with: node create-usdc-account.js

const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");

// Configuration
const DEVNET_RPC = "https://api.devnet.solana.com";
const DEVNET_USDC_MINT = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
const YOUR_WALLET = "BydpT8CHkxaGgEDcqAkJ2nMCrFDv6NDoyN3SxZuheDsE";

async function createUSDCAccount() {
  console.log("🔧 Creating USDC Token Account on Devnet...\n");

  // Connect to devnet
  const connection = new Connection(DEVNET_RPC, "confirmed");
  console.log("✅ Connected to Solana Devnet");

  // Your wallet public key
  const walletPubkey = new PublicKey(YOUR_WALLET);
  const usdcMint = new PublicKey(DEVNET_USDC_MINT);

  // Get associated token account address
  const ataAddress = await getAssociatedTokenAddress(
    usdcMint,
    walletPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log("📍 Your wallet:", walletPubkey.toString());
  console.log("📍 USDC Mint:", usdcMint.toString());
  console.log("📍 Token Account (ATA):", ataAddress.toString());
  console.log();

  // Check if account already exists
  try {
    const accountInfo = await connection.getAccountInfo(ataAddress);
    if (accountInfo) {
      console.log("✅ Token account already exists!");
      console.log("\nℹ️  To get USDC, visit:");
      console.log("   https://faucet.solana.com/");
      console.log("   https://spl-token-faucet.com/?token-name=USDC-Dev");
      console.log("\n   Or ask someone with devnet USDC to send to:");
      console.log("   " + ataAddress.toString());
      return;
    }
  } catch (error) {
    // Account doesn't exist, continue to create it
  }

  console.log("❌ Token account doesn't exist yet\n");
  console.log("📝 To create the account, you need to:");
  console.log("   1. Have SOL for rent (~0.00203928 SOL)");
  console.log("   2. Sign a transaction with your wallet");
  console.log();
  console.log(
    "🔐 This script can't create the account without your private key."
  );
  console.log("   (We don't want to ask for your private key for security!)");
  console.log();
  console.log("💡 Best options:");
  console.log("   A) Use Phantom wallet on devnet and visit a faucet");
  console.log("   B) Use Solana CLI:");
  console.log(
    `      spl-token create-account ${DEVNET_USDC_MINT} --url devnet`
  );
  console.log();
  console.log("   C) I can add auto-creation to your mobile app!");
}

createUSDCAccount().catch(console.error);
