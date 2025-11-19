# 🪙 How to Get Devnet USDC

## The Problem

Your wallet shows:

```
LOG  USDC token account not found - wallet has 0 USDC
```

This means your wallet **doesn't have a USDC token account yet**. On Solana, you need to create a token account for each SPL token (like USDC) before you can receive it.

## Solution: Get Devnet USDC

### Method 1: SPL Token Faucet (Easiest)

1. **Visit the faucet:**
   - Go to: https://faucet.solana.com/
   - Or: https://spl-token-faucet.com/?token-name=USDC-Dev

2. **Connect your wallet:**
   - Make sure Phantom is on **Devnet** network
   - Click "Connect Wallet"
   - Approve connection

3. **Request USDC:**
   - Select "USDC-Dev" from token list
   - Enter your wallet address: `BydpT8CHkxaGgEDcqAkJ2nMCrFDv6NDoyN3SxZuheDsE`
   - Click "Airdrop" or "Request"
   - Wait for confirmation

### Method 2: Use Solana CLI

If the faucet isn't working, use the CLI:

```bash
# Install spl-token CLI (if not installed)
cargo install spl-token-cli

# Create USDC token account (costs ~0.00203928 SOL)
spl-token create-account Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr --url devnet --owner BydpT8CHkxaGgEDcqAkJ2nMCrFDv6NDoyN3SxZuheDsE

# Mint some devnet USDC to yourself (if you have minting authority)
# Or ask someone with devnet USDC to send you some
```

### Method 3: Create Account Manually (Advanced)

If you can't use the faucet, I can help you create a script to:

1. Create the associated token account for USDC
2. Fund it with devnet tokens

## Quick Check: Is Phantom on Devnet?

**To switch Phantom to Devnet:**

1. Open Phantom wallet
2. Click the hamburger menu (☰) → Settings
3. Scroll to "Developer Settings"
4. Enable "Testnet Mode"
5. Select "Devnet" from the network dropdown
6. Your wallet should now show devnet balances

## Alternative: Create Token Account via App

I can add a feature to your app that automatically creates the USDC token account when needed. Would you like me to add that?

## Verify Your Network

Let's check what network your wallet is actually on:

```bash
# Check wallet info on devnet
solana account BydpT8CHkxaGgEDcqAkJ2nMCrFDv6NDoyN3SxZuheDsE --url devnet

# Check if USDC account exists
spl-token accounts --url devnet --owner BydpT8CHkxaGgEDcqAkJ2nMCrFDv6NDoyN3SxZuheDsE
```

## What's Happening

1. **You have SOL:** ✅ 5.99976 SOL on devnet (for transaction fees)
2. **No USDC account:** ❌ Token account doesn't exist yet
3. **Can't receive USDC:** ❌ Until account is created

Once you create the token account or receive USDC (which auto-creates it), your balance will show!

## Expected Flow

**After getting devnet USDC:**

```
LOG  RPC Request to: https://api.devnet.solana.com
LOG  Token account balance: 10 USDC  ✅
LOG  Balances fetched: {"sol": 5.99976, "usdc": 10}  ✅
```

## Try This First (Easiest):

1. **Ensure Phantom is on Devnet**
2. **Visit:** https://faucet.solana.com/
3. **Request USDC-Dev tokens**
4. **Refresh your app** (press 'r' in Expo)

That should do it! 🎉

---

**If the faucet doesn't work, let me know and I can:**

- Add auto-creation of token accounts to your app
- Create a script to mint devnet USDC for testing
- Help you find alternative devnet USDC sources
