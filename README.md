## Solvend (Anchor/Solana Program)

Solvend is an Anchor-based Solana program that models a simple vending workflow with two phases:

- Initialize a machine configuration with a payment token and price.
- Create time-bound vouchers off-chain after you confirm payment, and redeem them on-chain to record dispensing.

This separation lets you handle fiat/USDC payment confirmations off-chain while keeping issuance and redemption of vouchers verifiable on-chain.

### How it works (simple)

- 🛠️ Setup once: Configure the machine with which token to accept (e.g., USDC) and the price.
- 💳 Pay: User pays (you can verify off-chain or on-chain).
- 🎟️ Issue voucher: After payment, you issue a short-lived voucher to the user.
- 🤖 Dispense & ✅ Redeem: Dispenser checks the voucher/OTP and redeems it on-chain.
- ⭐ Track loyalty: Each successful purchase increments the user's progress; after enough purchases, you can attach an NFT mint as a reward.

### Program ID

The program declares the following ID in `programs/solvend/src/lib.rs`:

```
FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW
```

Update your local ID if you redeploy under a different keypair.

---

### Accounts

- `MachineConfig`
  - `owner: Pubkey` — wallet that initialized the machine
  - `token_mint: Pubkey` — SPL token mint for payments (e.g., USDC)
  - `price: u64` — price in smallest token units (e.g., USDC has 6 decimals)
  - `total_sales: u64` — placeholder for future accounting (not incremented yet)
  - `bump: u8` — PDA bump

- `Voucher`
  - `user: Pubkey` — end user receiving the voucher
  - `hash_otp: [u8; 32]` — hash of an OTP or secret used by the dispenser
  - `expiry_ts: i64` — unix timestamp when the voucher expires
  - `redeemed: bool` — whether the voucher has been redeemed
  - `is_free: bool` — marks whether payment was waived (e.g., free vend)
  - `nonce: u64` — unique value to derive a unique PDA per user/issuance
  - `bump: u8` — PDA bump

- `UserProgress`
  - `user: Pubkey` — the user being tracked
  - `purchase_count: u8` — number of completed purchases (e.g., capped at 10)
  - `nft_mint: Option<Pubkey>` — optional NFT minted as a loyalty reward
  - `opt_in: bool` — whether the user opted into tracking/rewards
  - `total_earnings: u64` — application-specific metric you can use
  - `bump: u8` — PDA bump

- `Treasury`
  - `token_account: Pubkey` — SPL token account holding collected fees
  - `total_collected: u64` — total tokens collected (e.g., USDC in base units)
  - `bump: u8` — PDA bump

- `Report`
  - `report_id: u64` — sequential ID for each report
  - `buyer: Pubkey` — who bought the report
  - `report_type: ReportType` — Daily | Weekly | Monthly
  - `timeframe_days: u8` — how many days to cover
  - `paid_amount: u64` — amount paid for the report
  - `ipfs_cid: Option<String>` — optional IPFS CID when data is ready
  - `status: ReportStatus` — Pending | Ready | Distributed
  - `created_at: i64` — unix timestamp
  - `remaining_for_distribution: u64` — amount left to distribute to users
  - `bump: u8` — PDA bump

---

### PDAs

- `MachineConfig` PDA: `seeds = [b"machine"]`
- `Voucher` PDA: `seeds = [b"voucher", user.key().as_ref(), nonce.to_le_bytes()]`
- `UserProgress` PDA: `seeds = [b"user", user.key().as_ref()]`
- `Treasury` PDA: `seeds = [b"treasury"]`
- `Treasury Token Account` PDA: `seeds = [b"treasury", b"usdtoken"]` (token account owned by `Treasury`)
- `Report` PDA: `seeds = [b"report", <report_id>.to_le_bytes()]` (created when buying a report)

These are created and derived via Anchor using the provided seeds and stored bump.

---

### Instructions

1) `initialize_machine(price: u64, token_mint: Pubkey)`

Accounts:

- `machine_config` (PDA, init, payer = owner)
- `owner` (signer, mutable)
- `system_program` (auto-resolved)

Behavior:

- Creates the `MachineConfig` PDA and stores `owner`, `price`, `token_mint`, sets `total_sales = 0` and saves the bump.

2) `create_voucher(hash_otp: [u8; 32], expiry_ts: i64, is_free: bool, nonce: u64)`

Accounts:

- `voucher` (PDA, init, payer = authority)
- `user` (any account; the user receiving the voucher)
- `authority` (signer, mutable; the backend/merchant issuing the voucher)
- `system_program` (auto-resolved)

Behavior:

- Requires `expiry_ts` be in the future.
- Writes a voucher for `user` with supplied values and saves the bump.

3) `redeem_voucher()`

Accounts:

- `voucher` (PDA, mut)
- `authority` (signer)

Behavior:

- Requires the voucher is not already redeemed and not expired.
- Marks voucher `redeemed = true` and emits `VoucherRedeemed` event with `user`, timestamp, `is_free`.

4) `increment_progress(opt_in: bool)`

Accounts:

- `user_progress` (PDA, init if needed, payer = authority)
- `machine_config` (mut)
- `user` (any account; the user being tracked)
- `authority` (signer; the backend/merchant/dispenser)
- `system_program` (auto-resolved)

Behavior:

- Creates the user's progress account if missing.
- On first increment, sets `user`, `opt_in`, and initializes counters.
- Requires progress not to be full (e.g., less than 10).
- Increments `purchase_count` and also increments machine `total_sales`.
- Emits `ProgressIncremented` with the new count.

Example (TypeScript):

```ts
await program.methods
  .incrementProgress(true)
  .accounts({
    userProgress: userProgressPda,
    machineConfig: machineConfigPDA,
    user: userPublicKey,
    authority: authority.publicKey,
  })
  .signers([authority])
  .rpc();
```

5) `set_nft_mint(nft_mint: Pubkey)`

Accounts:

- `user_progress` (PDA, mut)
- `authority` (signer)

Behavior:

- Requires `purchase_count` to meet the threshold (e.g., 10) and that no NFT is already set.
- Saves the provided NFT mint as the reward for the user.

Example:

```ts
await program.methods
  .setNftMint(nftMint)
  .accounts({
    userProgress: userProgressPda,
    authority: authority.publicKey,
  })
  .signers([authority])
  .rpc();
```

6) `reset_progress()`

Accounts:

- `user_progress` (PDA, mut)
- `authority` (signer)

Behavior:

- Requires an NFT to be set, then clears it and resets `purchase_count` to 0.
7) `initialize_treasury()`

Accounts:

- `treasury` (PDA, init)
- `treasury_token_account` (PDA, init; SPL token owned by `treasury`)
- `usdc_mint` (SPL token mint account)
- `authority` (signer)
- `system_program`, `token_program`, `rent` (auto-resolved programs/sysvars)

Behavior:

- Creates a treasury PDA and its SPL token account for collecting fees/shares.

8) `buy_report(report_type: ReportType, timeframe_days: u8)`

Accounts:

- `report` (PDA, init)
- `treasury` (mut), `treasury_token_account` (mut)
- `buyer_token_account` (mut) — buyer's SPL token account paying the fee
- `owner_token_account` (mut) — machine owner's token account to receive 10% share
- `machine_config` (read-only)
- `buyer` (signer)
- `token_program`, `system_program`

Behavior:

- Transfers report price from buyer to treasury, then sends 10% to machine owner.
- Creates a `Report` record with status `Pending` and tracks remaining 90% for distribution.

9) `attach_report_data(ipfs_cid: String)`

Accounts:

- `report` (mut; must be `Pending`)
- `authority` (signer)

Behavior:

- Attaches an IPFS CID to the report and marks it `Ready`.

10) `distribute_earnings(report_id: u64, num_recipient: u8)`

Accounts:

- `report` (mut; must be `Ready`)
- `treasury` (read-only), `treasury_token_account` (mut)
- `authority` (signer)
- Remaining accounts: repeated pairs `[user_token_account_i, user_progress_i]`

Behavior:

- Splits the remaining amount evenly across `num_recipient` users, transfers tokens from
  treasury to each `user_token_account_i`, and updates each `user_progress_i.total_earnings`.
- Marks report as `Distributed` and zeroes remaining amount.

Minimal example (TypeScript outline):

```ts
// remainingAccounts: [userToken0, userProgress0, userToken1, userProgress1, ...]
await program.methods
  .distributeEarnings(reportId, numRecipients)
  .accounts({
    report: reportPda,
    treasury: treasuryPda,
    treasuryTokenAccount: treasuryTokenPda,
    authority: authority.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .remainingAccounts(remainingAccounts.map(a => ({ pubkey: a, isWritable: true, isSigner: false })))
  .signers([authority])
  .rpc();
```

11) `claim_earnings(amount: u64, proof: Vec<[u8; 32]>)`

Accounts:

- `report` (read-only; must be `DistributionReady` with a `merkle_root` set)
- `treasury` (read-only), `treasury_token_account` (mut)
- `claimant_token_account` (mut) — claimant's SPL token account to receive funds
- `claimant` (signer) — wallet claiming their share
- `token_program`

Behavior (simple):

- Off-chain, you build a Merkle tree of eligible claimants and their amounts; the program stores the root.
- The claimant submits their `amount` and Merkle `proof`; on-chain we hash the leaf as
  `keccak(user_pubkey || amount_32_bytes)` and verify the proof against the stored root.
- If valid, tokens are transferred from treasury to the claimant.

Example (TypeScript outline):

```ts
await program.methods
  .claimEarnings(amount, proof)
  .accounts({
    report: reportPda,
    treasury: treasuryPda,
    treasuryTokenAccount: treasuryTokenPda,
    claimantTokenAccount: claimantAta,
    claimant: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([])
  .rpc();
```

Example:

```ts
await program.methods
  .resetProgress()
  .accounts({
    userProgress: userProgressPda,
    authority: authority.publicKey,
  })
  .signers([authority])
  .rpc();
```

---

### Building

```bash
anchor build
```

Artifacts will be under `target/` including the IDL.

### Localnet and Deployment

```bash
# Start a local validator
solana-test-validator -r

# In another shell, set cluster and keypair
solana config set --url localhost

# Deploy
anchor deploy
```

If you change the deployed program ID, update `declare_id!` in `lib.rs` and any client config pointing to the program.

---

### Testing

Tests live under `tests/`. Example for initializing the machine (TypeScript test):

```ts
const tx = await program.methods
  .initializeMachine(priceOnChain, usdcMint)
  .accounts({
    machineConfig: machineConfigPDA,
    owner: owner.publicKey,
  })
  .rpc();
```

Note:

- `systemProgram` is auto-resolved by Anchor; do not pass it manually.
- The `machineConfig` PDA is derived with `seeds = ["machine"]` as in the test helper:

```ts
const [machineConfigPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("machine")],
  program.programId,
);
```

Run all tests:

```bash
anchor test
```

---

### Example Voucher Flow (client-side outline)

1. User pays off-chain or via SPL token transfer you verify.
2. Backend confirms payment, then issues a voucher on-chain:

```ts
await program.methods
  .createVoucher(hashOtp, expiryTs, false, nonce)
  .accounts({
    voucher: voucherPda,
    user: userPubkey,
    authority: backendAuthority.publicKey,
  })
  .signers([backendAuthority])
  .rpc();
```

3. Dispenser validates OTP and redeems on-chain to record success:

```ts
await program.methods
  .redeemVoucher()
  .accounts({
    voucher: voucherPda,
    authority: dispenserAuthority.publicKey,
  })
  .signers([dispenserAuthority])
  .rpc();
```

---

### Notes and Considerations

- Prices must be provided in smallest token units (e.g., USDC has 6 decimals).
- `total_sales` is incremented when `increment_progress` succeeds.
- `hash_otp` should be computed off-chain (e.g., SHA-256 of an OTP/secret).
- `authority` semantics for issuing and redeeming can be tailored to your trust model.
- Minimal emojis are used above to give a high-level sense of the flow without adding noise.

### Token/CPI Notes (simple)

- All token transfers use SPL Token CPI via `anchor_spl::token::transfer`.
- The treasury token account is a PDA, so CPI calls that move funds out of it
  use a signer seed like `[b"treasury", &[treasury.bump]]`.
- Prices are hardcoded for `ReportType` in the program via `get_report_price` and use base units (e.g., USDC 6 decimals).

---

## Backend API Server

The backend is a Node.js/TypeScript API server that acts as the bridge between the vending machine hardware and the Solana blockchain. It handles payment verification, voucher creation, and OTP management.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vending       │    │   Backend API   │    │   Solana        │
│   Machine       │◄──►│   Server        │◄──►│   Blockchain    │
│   (Hardware)    │    │   (Node.js)     │    │   (Anchor)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   MongoDB        │
                       │   Database       │
                       └─────────────────┘
```

### Core Components

#### 1. **API Server** (`src/index.ts`)
- Express.js server running on port 3000 (configurable via `PORT` env var)
- Handles REST API endpoints for vending machine communication
- Manages database connections and blockchain listeners

#### 2. **Database Models** (`src/database/models/`)
- **Purchase Model**: Tracks purchase transactions with status flow:
  - `PENDING` → `VOUCHER_CREATED` → `REDEEMED` → `EXPIRED`
  - Stores reference ID, user wallet, OTP hash, nonce, and timestamps

#### 3. **Blockchain Integration** (`src/services/solana.service.ts`)
- **Solana Service**: Handles on-chain operations
  - `createVoucherOnChain()`: Creates time-bound vouchers on Solana
  - `redeemAndIncrement()`: Redeems vouchers and tracks user progress
- **Program Connection**: Uses Anchor framework to interact with the Solana program
- **Wallet Management**: Backend wallet for signing transactions

#### 4. **Blockchain Listener** (`src/listeners/blockchain.listener.ts`)
- **Real-time Monitoring**: Listens for Solana transactions containing memo instructions
- **Payment Detection**: Identifies payments by parsing memo data for reference IDs
- **Automatic Voucher Creation**: Creates vouchers and OTPs when payments are detected

#### 5. **API Controllers** (`src/api/controllers/`)
- **Purchase Controller**: Handles OTP validation and voucher redemption
- **REST Endpoints**: Provides HTTP API for vending machine integration

### Workflow: Complete Purchase Flow

#### Step 1: Payment Detection
```typescript
// 1. User makes payment with reference ID in memo
// 2. Blockchain listener detects transaction
const referenceId = Buffer.from(memoIx.data, 'base64').toString('utf-8');
const purchase = await Purchase.findOne({ referenceId, status: 'PENDING' });
```

#### Step 2: Voucher Creation
```typescript
// 3. Generate OTP and create voucher on-chain
const otp = Math.floor(1000 + Math.random() * 9000).toString();
const otpHash = Buffer.from(keccak256.digest(otp));
const nonce = Date.now();

await createVoucherOnChain(userWallet, otpHash, nonce);
```

#### Step 3: Database Update
```typescript
// 4. Update purchase record
purchase.status = 'VOUCHER_CREATED';
purchase.otpHash = keccak256(otp);
purchase.otpExpiry = new Date(Date.now() + 3600 * 1000);
purchase.nonce = nonce;
await purchase.save();
```

#### Step 4: OTP Delivery
```typescript
// 5. Send OTP to user (via notification service)
sendOtpToUser(userWallet.toBase58(), otp);
```

#### Step 5: Voucher Redemption
```typescript
// 6. Vending machine validates OTP
// POST /api/validate-otp
const { otp } = req.body;
const otpHash = keccak256(otp);
const purchase = await Purchase.findOne({ otpHash, status: 'VOUCHER_CREATED' });

// 7. Redeem voucher on-chain
await redeemAndIncrement(new PublicKey(purchase.userWallet), purchase.nonce, userOptIn);
```

### API Endpoints

#### `POST /api/validate-otp`
Validates OTP and redeems voucher for vending machine.

**Request:**
```json
{
  "otp": "1234"
}
```

**Response (Success):**
```json
{
  "message": "Success",
  "dispense": true
}
```

**Response (Error):**
```json
{
  "message": "Invalid or expired OTP"
}
```

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# Solana Configuration
SOLANA_RPC_HOST=https://api.mainnet-beta.solana.com
PROGRAM_ID=FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW
BACKEND_WALLET_PATH=/path/to/backend-wallet.json

# Database
MONGODB_URI=mongodb://localhost:27017/solvend

# Server
PORT=3000
```

### Database Schema

#### Purchase Collection
```typescript
interface IPurchase {
  referenceId: string;        // Unique payment reference
  transactionSignature?: string; // Solana transaction signature
  userWallet: string;         // User's wallet address
  otpHash?: string;          // Hashed OTP for validation
  otpExpiry?: Date;          // OTP expiration time
  nonce?: number;            // Unique nonce for voucher
  status: 'PENDING' | 'VOUCHER_CREATED' | 'REDEEMED' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
}
```

### Security Features

1. **OTP Hashing**: OTPs are hashed using keccak256 before storage
2. **Time Expiration**: Vouchers expire after 1 hour
3. **One-time Use**: Vouchers can only be redeemed once
4. **Nonce Uniqueness**: Each voucher has a unique nonce to prevent replay attacks

### Error Handling

The backend includes comprehensive error handling for:
- Invalid OTP formats
- Expired vouchers
- Missing purchase records
- Blockchain transaction failures
- Database connection issues

### Development Setup

1. **Install Dependencies:**
```bash
cd backend
npm install
```

2. **Start Development Server:**
```bash
npm run dev
```

3. **Build for Production:**
```bash
npm run build
```

### Integration with Vending Machine

The backend provides a simple HTTP API that vending machines can use:

1. **Payment Flow**: Machine displays QR code with payment instructions
2. **OTP Entry**: User enters OTP received via notification
3. **Validation**: Machine calls `/api/validate-otp` endpoint
4. **Dispensing**: If validation succeeds, machine dispenses product

### Monitoring and Logging

The backend includes comprehensive logging for:
- Blockchain transaction monitoring
- API request/response logging
- Error tracking and debugging
- Purchase flow analytics

This backend architecture provides a robust, scalable solution for integrating physical vending machines with the Solana blockchain, ensuring secure and verifiable transactions while maintaining a smooth user experience.


