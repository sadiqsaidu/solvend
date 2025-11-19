# Solvend Backend API Integration Guide

## Overview

This project integrates with the Solvend backend API to manage vending machine purchases, vouchers, OTP validation, and earnings claims. The backend handles blockchain interactions while the mobile app provides the user interface.

**Backend Repository**: https://github.com/sadiqsaidu/solvend

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Mobile App     │────────▶│  Solvend API     │────────▶│  Solana Chain   │
│  (React Native) │         │  (Node.js)       │         │  (Smart Contract)│
│                 │◀────────│                  │◀────────│                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
       │                            │
       │                            │
       ▼                            ▼
  User Interface            MongoDB Database
```

## API Integration

### 1. Setup

The API service is located in `utils/solvend API.ts` and provides TypeScript classes for all endpoints.

**Configuration** (`.env` file):

```bash
EXPO_PUBLIC_SOLVEND_API_URL=http://localhost:3000/api  # For development
# EXPO_PUBLIC_SOLVEND_API_URL=https://your-backend.com/api  # For production
```

### 2. Purchase Flow

#### Step 1: Create Purchase

```typescript
import { SolvendAPI } from "@/utils/solvend API";

// User initiates purchase
const response = await SolvendAPI.Purchase.createPurchase({
  userWallet: walletAddress, // User's Solana wallet address
  amount: 5000000, // Amount in micro-USDC (5 USDC = 5,000,000)
});

// Response contains:
// - referenceId: Unique payment reference
// - treasuryTokenAccount: Where to send payment
// - memo: Payment memo (same as referenceId)
```

#### Step 2: User Pays

The user sends USDC to the `treasuryTokenAccount` with `memo = referenceId`:

```typescript
// Using Solana Pay or Mobile Wallet Adapter
const transaction = await createUSDCPaymentTransaction(
  userPublicKey,
  amount,
  treasuryTokenAccount,
  referenceId // Include as memo
);
```

#### Step 3: Backend Auto-Processing

The backend has a **blockchain listener** that:

1. Detects incoming payments to the treasury account
2. Reads the memo to find the `referenceId`
3. Creates a voucher on-chain
4. Generates a 4-digit OTP
5. Sends OTP to user via notification

All of this happens **automatically** - no app action needed!

#### Step 4: Validate OTP

```typescript
// User enters OTP at vending machine
const result = await SolvendAPI.Purchase.validateOtp({
  otp: "1234", // 4-digit OTP
});

if (result.success) {
  console.log("Voucher redeemed! Transaction:", result.tx);
  // Dispense product
} else {
  console.error("OTP validation failed:", result.error);
}
```

### 3. Claims Flow

Users can claim their earnings from the vending machine rewards:

```typescript
// Get Merkle proof for claiming
const proof = await SolvendAPI.Claims.getClaimProof(userWallet);

// proof contains:
// - root: Merkle root
// - amount: Claimable amount
// - proof: Array of hashes for verification

// Use proof to claim on-chain
// (Implementation depends on smart contract integration)
```

### 4. Reports Flow

Data buyers can purchase analytics reports:

```typescript
const reportPurchase = await SolvendAPI.Reports.createReportPurchase({
  buyerWallet: walletAddress,
  reportType: "Weekly", // 'Daily' | 'Weekly' | 'Monthly'
  timeframeDays: 7, // 1-365 days
});

// Prices:
// - Daily: 100 USDC
// - Weekly: 500 USDC
// - Monthly: 1000 USDC

// After payment, backend processes the report and attaches IPFS data
```

### 5. Admin Endpoints (Advanced)

Admin endpoints require signature verification:

```typescript
// Submit Merkle root for distribution
await SolvendAPI.Admin.submitDistributionRoot(
  {
    root: merkleRootHex,
    reportId: "report-xyz",
    buyerWallet: buyerAddress,
  },
  authHeaders // { x-signature, x-timestamp, x-public-key }
);

// Attach IPFS data to report
await SolvendAPI.Admin.attachReportData(
  {
    reportId: "report-xyz",
    buyerWallet: buyerAddress,
    ipfsCid: "Qm...",
  },
  authHeaders
);
```

## Database Models

### Purchase Model

```typescript
interface IPurchase {
  referenceId: string; // UUID for tracking
  transactionSignature?: string; // Solana tx hash
  userWallet: string; // User's wallet address
  amount?: number; // Purchase amount
  otpHash?: string; // Hashed OTP (keccak256)
  otpExpiry?: Date; // OTP expires in 1 hour
  nonce?: number; // Unique voucher nonce
  status: "PENDING" | "VOUCHER_CREATED" | "REDEEMED" | "EXPIRED";
}
```

### Report Model

```typescript
interface IReport {
  referenceId: string;
  reportId: string;
  buyerWallet: string;
  reportType: "Daily" | "Weekly" | "Monthly";
  timeframeDays: number;
  amount: number;
  status: "PENDING" | "PAID" | "READY" | "DISTRIBUTION_READY";
  transactionSignature?: string;
  ipfsCid?: string; // Report data on IPFS
  merkleRoot?: string; // For earnings distribution
}
```

## Security Features

### 1. OTP Hashing

OTPs are hashed using `keccak256` before storage - the backend never stores plain-text OTPs.

### 2. Time Expiration

Vouchers expire after 1 hour to prevent fraud.

### 3. Nonce Uniqueness

Each voucher has a unique nonce to prevent replay attacks.

### 4. Admin Authentication

Admin endpoints require:

- Signature of `timestamp + requestBody`
- Public key verification
- Timestamp within 5-minute window

### 5. One-time Use

Vouchers can only be redeemed once on-chain.

## Smart Contract Integration

**Program ID**: `FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW`

### Key Accounts

- **MachineConfig**: Machine settings (owner, price, token mint)
- **Voucher**: Time-bound vouchers with OTP validation
- **UserProgress**: Tracks user loyalty and earnings
- **Treasury**: Collects fees and manages distributions
- **Report**: Data report purchases and distributions

### Core Instructions

1. `initialize_machine`: Set up machine configuration
2. `create_voucher`: Issue time-bound vouchers
3. `redeem_voucher`: Redeem vouchers and track progress
4. `buy_report`: Purchase data reports
5. `claim_earnings`: Claim distributed earnings via Merkle proofs

## Implementation in index.tsx

The main home screen has been integrated with the Solvend API:

```typescript
// When user selects a drink
const handleDrinkSelect = async (drink: DrinkItem) => {
  // 1. Create purchase on backend
  const purchase = await SolvendAPI.Purchase.createPurchase({
    userWallet: walletAddress,
    amount: drink.price * 1_000_000, // Convert to micro-USDC
  });

  // 2. User pays via Solana Pay
  const tx = await createUSDCPaymentTransaction(
    userPublicKey,
    drink.price,
    purchase.treasuryTokenAccount,
    purchase.referenceId // Include as memo
  );

  // 3. Backend detects payment automatically
  // 4. User receives OTP
  // 5. User enters OTP to redeem
};

// When user enters OTP at machine
const validateOTP = async (otp: string) => {
  const result = await SolvendAPI.Purchase.validateOtp({ otp });

  if (result.success) {
    // Dispense drink
  }
};
```

## Environment Setup

### Backend (.env)

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW
BACKEND_WALLET_PATH=./keys/backend.json
BACKEND_WALLET_PUBKEY=YOUR_BACKEND_WALLET_PUBKEY
TREASURY_TOKEN_ACCOUNT=YOUR_TREASURY_TOKEN_ACCOUNT
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
MONGO_URI=mongodb://localhost:27017/solvend
PORT=3000
```

### Mobile App (.env)

```bash
EXPO_PUBLIC_SOLVEND_API_URL=http://localhost:3000/api
```

## Running the System

### 1. Start Backend

```bash
cd backend
npm install
npm run dev
```

The API will be available at `http://localhost:3000/api`

### 2. Start Blockchain Listener

The backend automatically starts two listeners:

- **Payment Listener**: Detects USDC payments and creates vouchers
- **Report Listener**: Detects report payments and processes reports

### 3. Start Mobile App

```bash
npm install
npx expo start
```

## Testing Flow

### Test a Purchase

1. **Create purchase**:

   ```bash
   curl -X POST http://localhost:3000/api/purchase/create \
     -H "Content-Type: application/json" \
     -d '{"userWallet":"YOUR_WALLET","amount":5000000}'
   ```

2. **Send payment** with the returned `referenceId` as memo

3. **Check OTP** (for testing, check MongoDB or backend logs)

4. **Validate OTP**:
   ```bash
   curl -X POST http://localhost:3000/api/validate-otp \
     -H "Content-Type: application/json" \
     -d '{"otp":"1234"}'
   ```

## Error Handling

### Common Errors

- `Invalid OTP`: OTP doesn't match or already used
- `OTP expired`: More than 1 hour has passed
- `Invalid purchase status`: Purchase not in correct state
- `Missing userWallet or nonce`: Database issue

### Network Errors

The API includes retry logic and fallback RPC endpoints:

```typescript
const RPC_ENDPOINTS = [
  "https://solana-mainnet.g.alchemy.com/v2/demo",
  "https://rpc.ankr.com/solana",
  "https://api.mainnet-beta.solana.com",
];
```

## Future Enhancements

1. **Push Notifications**: Implement Firebase Cloud Messaging for OTP delivery
2. **QR Code Scanning**: Scan QR at physical machine instead of manual OTP entry
3. **Loyalty Program**: Track purchases and offer rewards
4. **Analytics Dashboard**: View purchase history and spending patterns
5. **Multi-tenant**: Support multiple vending machines with different configs

## Support

- **Backend Issues**: Check MongoDB connection, RPC endpoint, wallet keypair
- **Smart Contract**: Verify program deployment and account initialization
- **API Integration**: Ensure correct `SOLVEND_API_URL` in `.env`
- **Blockchain**: Monitor Solana transaction confirmations

## References

- Backend Repo: https://github.com/sadiqsaidu/solvend
- Solana Docs: https://docs.solana.com
- Anchor Framework: https://www.anchor-lang.com
- Privy Auth: https://docs.privy.io
- Expo: https://docs.expo.dev
