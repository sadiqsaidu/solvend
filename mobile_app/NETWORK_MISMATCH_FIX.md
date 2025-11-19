# ⚠️ CRITICAL: Network Mismatch Issue

## The Problem

Your mobile app is sending transactions on **MAINNET**, but your backend is listening on **DEVNET**. They can't see each other!

**Evidence from logs:**

```
LOG  Wallet connected, authorizing...
// App authorizes with: cluster: "mainnet-beta"

// But backend .env has:
SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Why It Hangs

The transaction gets stuck because:

1. App creates transaction for **mainnet**
2. Phantom is connected to **mainnet**
3. But the treasury account `5ReMQrivJK31UuvNpjF5Qt8fiABxY4oRbwVwZHYdp7PD` exists on **devnet**
4. Phantom can't find the account, so it hangs or fails

## The Fix - Two Options:

### Option 1: Switch App to Devnet (RECOMMENDED for testing)

**Pros:** Free devnet SOL and USDC for testing  
**Cons:** Need devnet tokens

#### Steps:

1. **Update authorization in `app/(tabs)/index.tsx`:**

Find this line (around line 315):

```typescript
cluster: "mainnet-beta",
```

Change to:

```typescript
cluster: "devnet",
```

2. **Update Solana RPC URL:**

In your `utils/solanaUtils.ts` or wherever the connection is created, change:

```typescript
// FROM:
"https://solana-mainnet.g.alchemy.com/v2/demo";

// TO:
"https://api.devnet.solana.com";
```

3. **Get Devnet Tokens:**

```bash
# Airdrop devnet SOL to your wallet
solana airdrop 2 BydpT8CHkxaGgEDcqAkJ2nMCrFDv6NDoyN3SxZuheDsE --url devnet

# Get devnet USDC from:
# https://spl-token-faucet.com/?token-name=USDC-Dev
```

4. **Restart everything:**

```bash
# Backend
cd solvend/backend
npm run dev

# Expo (press 'r' to reload)
```

---

### Option 2: Switch Backend to Mainnet (NOT RECOMMENDED - costs real money)

**Pros:** Works with real wallets  
**Cons:** Costs real SOL and USDC, treasury account needs to be on mainnet

#### Steps:

1. **Update `solvend/backend/.env`:**

```bash
# Change this:
SOLANA_RPC_URL=https://api.devnet.solana.com

# To this:
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use Alchemy:
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Update USDC mint to mainnet:
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# ⚠️ IMPORTANT: Treasury must exist on mainnet!
# Your current treasury might not exist on mainnet
TREASURY_TOKEN_ACCOUNT=<your_mainnet_treasury_account>
```

2. **Fund your backend wallet with real SOL**

3. **Deploy Solvend program to mainnet** (if not already deployed)

---

## Quick Test - Which Network Am I On?

```bash
# Check your wallet on devnet:
solana account BydpT8CHkxaGgEDcqAkJ2nMCrFDv6NDoyN3SxZuheDsE --url devnet

# Check your wallet on mainnet:
solana account BydpT8CHkxaGgEDcqAkJ2nMCrFDv6NDoyN3SxZuheDsE --url mainnet-beta

# Check treasury on devnet:
solana account 5ReMQrivJK31UuvNpjF5Qt8fiABxY4oRbwVwZHYdp7PD --url devnet

# Check treasury on mainnet:
solana account 5ReMQrivJK31UuvNpjF5Qt8fiABxY4oRbwVwZHYdp7PD --url mainnet-beta
```

## Recommendation

**Use Devnet for now!** It's free and perfect for testing. Once everything works, you can switch to mainnet.

## Files to Change for Devnet:

1. **`app/(tabs)/index.tsx`** - Line ~315:

   ```typescript
   cluster: "devnet",  // Change from "mainnet-beta"
   ```

2. **`utils/solanaUtils.ts`** - RPC URL:
   ```typescript
   const RPC_URL = "https://api.devnet.solana.com";
   ```

After making these changes, **restart both backend and Expo**, then try the purchase flow again!

---

## Additional Fix for signAndSendTransactions

I also fixed the `signAndSendTransactions` API call. It should now properly destructure the response:

```typescript
// OLD (wrong):
const signedTransactions = await wallet.signAndSendTransactions({...});
const signature = signedTransactions[0]; // ❌ Wrong

// NEW (correct):
const { signatures } = await wallet.signAndSendTransactions({...});
const signature = signatures[0]; // ✅ Correct
```

This is already fixed in your code now.

---

**TL;DR:**

1. **Switch app to devnet** (change `cluster:` in index.tsx)
2. **Use devnet RPC** in solanaUtils.ts
3. **Get devnet tokens** from faucets
4. **Restart everything**
5. **Try again** - should work! ✅
