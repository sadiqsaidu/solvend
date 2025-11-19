# 🔧 Fixed: USDC Balance Showing 0 on Devnet

## The Problem

You have devnet USDC but the app was showing **0 USDC balance**.

## Root Cause

The app was using the **mainnet USDC mint address** to check your balance:

```
❌ EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (Mainnet USDC)
```

But you have **devnet USDC**, which has a different mint address:

```
✅ Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr (Devnet USDC)
```

It's like checking your bank account in the wrong country - the account doesn't exist there!

## The Fix

I updated both files to use the **devnet USDC mint address**:

### File 1: `utils/solanaUtils.ts`

```typescript
// BEFORE (mainnet):
const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// AFTER (devnet):
const USDC_MINT_ADDRESS = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
```

### File 2: `utils/solanaPayUtils.ts`

```typescript
// Same change - updated to devnet USDC mint
const USDC_MINT_ADDRESS = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
```

## Test It Now!

**Restart your Expo app:**

```bash
# Press 'r' in the Expo terminal
# Or restart completely
npx expo start
```

Your USDC balance should now display correctly! 💰

## Expected Result

Before:

```
LOG  Balances fetched: {"sol": 0.001077498, "usdc": 0}  ❌
```

After:

```
LOG  Balances fetched: {"sol": 0.001077498, "usdc": 1.5}  ✅
```

## Why This Happened

Each Solana network (mainnet, devnet, testnet) has its own version of USDC:

| Network     | USDC Mint Address                              |
| ----------- | ---------------------------------------------- |
| **Mainnet** | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| **Devnet**  | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` |
| **Testnet** | Different address                              |

When you get devnet USDC from a faucet, it's minted using the devnet address. The app needs to check the correct mint to see your balance.

## Complete Devnet Configuration

Now all components are correctly configured for devnet:

| Component                | Setting        | Value                 |
| ------------------------ | -------------- | --------------------- |
| **Wallet Authorization** | cluster        | `"devnet"` ✅         |
| **RPC Endpoints**        | network        | Devnet ✅             |
| **USDC Mint**            | address        | Devnet (`Gh9Z...`) ✅ |
| **Backend**              | SOLANA_RPC_URL | Devnet ✅             |
| **Backend**              | USDC_MINT      | Devnet ✅             |
| **Treasury**             | account        | Devnet ✅             |

Everything is aligned! 🎯

## Switching to Mainnet Later

When you're ready for production, just uncomment the mainnet lines:

**In `utils/solanaUtils.ts` and `utils/solanaPayUtils.ts`:**

```typescript
// Switch from this:
const USDC_MINT_ADDRESS = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"; // Devnet

// To this:
const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // Mainnet
```

And update all other network settings back to mainnet.

## Summary

**Problem:** USDC balance showing 0  
**Cause:** Using mainnet USDC mint on devnet network  
**Fix:** Updated to devnet USDC mint (`Gh9Z...`)  
**Result:** Balance now displays correctly ✅

Restart your app and your devnet USDC should show up! 🎉
