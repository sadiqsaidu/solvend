# Solvend - Vending Machine on Solana

Solvend is a complete vending machine solution built on Solana that enables secure, blockchain-verified transactions for physical vending machines. The system consists of a backend API server and a Solana smart contract that work together to handle payments, vouchers, and loyalty tracking.

## 🚀 Quick Start for Frontend Developers

The backend provides a simple REST API that your frontend can integrate with. Here are the key endpoints you'll need:

### Core API Endpoints

#### 1. **Create Purchase** - `POST /api/purchase/create`
Start a new purchase and get payment instructions.

**Request:**
```json
{
  "userWallet": "USER_WALLET_PUBKEY",
  "amount": 5000000
}
```

**Response:**
```json
{
  "referenceId": "uuid-1234",
  "treasuryTokenAccount": "TREASURY_TOKEN_ACCOUNT_PUBKEY", 
  "amount": 5000000,
  "memo": "uuid-1234"
}
```

#### 2. **Validate OTP** - `POST /api/validate-otp`
Validate OTP from vending machine and redeem voucher.

**Request:**
```json
{
  "otp": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "tx": "transaction_signature"
}
```

#### 3. **Get Claim Proof** - `GET /api/claim-proof/:claimant`
Get Merkle proof for earnings claims.

**Response:**
```json
{
  "root": "0x...",
  "amount": "1000000", 
  "proof": ["hex1", "hex2"]
}
```

#### 4. **Create Report Purchase** - `POST /api/report/create`
Create a report purchase for data buyers.

**Request:**
```json
{
  "buyerWallet": "pubkey...",
  "reportId": "report-xyz",
  "amount": 100000000
}
```

**Response:**
```json
{
  "referenceId": "uuid-1234",
  "treasuryTokenAccount": "TREASURY_TOKEN_ACCOUNT_PUBKEY",
  "amount": 100000000,
  "memo": "uuid-1234"
}
```

### Frontend Integration Flow

```typescript
// 1. User initiates purchase
const purchaseResponse = await fetch('/api/purchase/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userWallet: userWallet.publicKey.toString(),
    amount: 5000000 // 5 USDC in smallest units
  })
});

const { referenceId, treasuryTokenAccount, memo } = await purchaseResponse.json();

// 2. User pays with memo = referenceId
// (User sends USDC to treasuryTokenAccount with memo = referenceId)

// 3. Backend automatically detects payment and creates voucher
// (No frontend action needed - handled by blockchain listener)

// 4. User receives OTP via notification
// (Backend sends OTP to user's preferred notification method)

// 5. User enters OTP at vending machine
// (Vending machine calls /api/validate-otp)
```

### Environment Setup

Create a `.env` file in the backend directory:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW
BACKEND_WALLET_PATH=./keys/backend.json
BACKEND_WALLET_PUBKEY=YOUR_BACKEND_WALLET_PUBKEY
TREASURY_TOKEN_ACCOUNT=YOUR_TREASURY_TOKEN_ACCOUNT
USDC_MINT=YOUR_USDC_MINT_ADDRESS

# Database
MONGO_URI=mongodb://localhost:27017/solvend

# Server
PORT=3000
```

### Running the Backend

```bash
cd backend
npm install
npm run dev
```

The API will be available at `http://localhost:3000/api`

## 📋 Complete API Reference

### Admin Endpoints (Protected)

#### 5. **Submit Distribution Root** - `POST /api/admin/submit-distribution-root`
Set Merkle root for earnings distribution (admin only).

**Request:**
```json
{
  "root": "hex_of_root",
  "reportId": "report-xyz", 
  "buyerWallet": "pubkey..."
}
```

**Response:**
```json
{
  "success": true,
  "transactionSignature": "tx_hash",
  "reportId": "report-xyz"
}
```

#### 6. **Attach Report Data** - `POST /api/admin/attach-report-data`
Attach IPFS CID to report (admin only).

**Request:**
```json
{
  "reportId": "report-xyz",
  "buyerWallet": "pubkey...",
  "ipfsCid": "Qm..."
}
```

**Response:**
```json
{
  "success": true,
  "transactionSignature": "tx_hash", 
  "reportId": "report-xyz",
  "ipfsCid": "Qm..."
}
```

### Database Models

#### Purchase Model
```typescript
interface IPurchase {
  referenceId: string;        // Unique payment reference
  userWallet: string;         // User's wallet address
  amount?: number;           // Purchase amount
  otpHash?: string;          // Hashed OTP for validation
  otpExpiry?: Date;          // OTP expiration time
  nonce?: number;            // Unique nonce for voucher
  status: 'PENDING' | 'VOUCHER_CREATED' | 'REDEEMED' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
}
```

#### Report Model
```typescript
interface IReport {
  referenceId: string;        // Unique payment reference
  reportId: string;          // Report identifier
  buyerWallet: string;       // Buyer's wallet address
  amount: number;            // Purchase amount
  status: 'PENDING' | 'PAID' | 'READY' | 'DISTRIBUTION_READY';
  transactionSignature?: string; // Solana transaction signature
  ipfsCid?: string;          // IPFS content identifier
  merkleRoot?: string;       // Merkle root for distribution
  createdAt: Date;
  updatedAt: Date;
}
```

### Security Features

- **OTP Hashing**: OTPs are hashed using keccak256 before storage
- **Time Expiration**: Vouchers expire after 1 hour
- **One-time Use**: Vouchers can only be redeemed once
- **Admin Authentication**: Admin endpoints require signature verification
- **Nonce Uniqueness**: Each voucher has a unique nonce to prevent replay attacks

---

## 🔧 Smart Contract (Solana Program)

The Solana program provides the on-chain functionality for vouchers, loyalty tracking, and report management.

### Program ID
```
FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW
```

### Key Accounts

- **MachineConfig**: Stores machine settings (owner, price, token mint)
- **Voucher**: Time-bound vouchers with OTP validation
- **UserProgress**: Tracks user loyalty and earnings
- **Treasury**: Collects fees and manages distributions
- **Report**: Manages data report purchases and distributions

### Core Instructions

1. **initialize_machine**: Set up machine configuration
2. **create_voucher**: Issue time-bound vouchers
3. **redeem_voucher**: Redeem vouchers and track progress
4. **buy_report**: Purchase data reports
5. **claim_earnings**: Claim distributed earnings via Merkle proofs

### Building and Deployment

```bash
# Build the program
anchor build

# Deploy to localnet
solana-test-validator -r
anchor deploy

# Run tests
anchor test
```

The program uses Anchor framework for type-safe Solana development with comprehensive error handling and security features.


