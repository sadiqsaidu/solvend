# Solvend: Blockchain-Powered Vending Machine on Solana

## 🚀 Introduction

**Solvend** is a revolutionary decentralized vending machine system built on the Solana blockchain. It transforms traditional vending machines into seamless, crypto-native experiences where users can purchase drinks (or other items) using Solana Pay, without QR codes or clunky hardware integrations. By leveraging Solana's high-speed, low-cost transactions, Solvend eliminates cash handling, reduces fraud, and introduces innovative features like NFT-based loyalty rewards and tokenized data marketplaces.

At its core, Solvend bridges the physical world (vending machines) with the digital economy:
- **Consumers** buy drinks with crypto and earn redeemable NFTs.
- **Machine Owners** gain automated revenue tracking and a cut from data sales.
- **Businesses** purchase anonymized insights (e.g., sales trends) with proceeds distributed fairly to opted-in users via Merkle proofs.

Solvend solves key pain points in vending operations: manual reconciliation, theft risks, limited analytics, and lack of user incentives. It's designed for scalability, with a modular architecture supporting multiple machines and global deployment.

## 🌟 Key Features

- **Solana Pay Integration**: Frictionless purchases via wallet apps (e.g., Phantom, Solflare), no QR scanning required.
- **OTP-Based Redemption**: Secure, one-time-use vouchers for physical dispensing, verified off-chain for speed.
- **Loyalty NFTs**: Earn a free drink NFT after 10 purchases; redeemable directly at the machine.
- **Data Marketplace**: Sell aggregated insights (daily/weekly/monthly reports) to businesses; pro-rata distribution to users via on-chain claims.
- **Owner Incentives**: 10% automated fee on data sales, plus full control over machine configs.
- **Decentralized & Auditable**: All transactions on Solana for transparency; Merkle trees ensure fair earnings claims.
- **Offline-Resilient**: Vending machines communicate via simple HTTP to backend; graceful fallbacks for network issues.
- **Multi-Token Support**: Currently USDC/USDT; extensible to SOL or custom tokens.

## 🔄 How It Works

Solvend operates in two primary modes: **Consumer Purchases** (drinks via Solana) and **Data Purchases** (insights for businesses). Below is a step-by-step breakdown.

### 1. Consumer Drink Purchases
1. **Initiate Purchase**:
   - User opens the Solvend mobile app (or web dApp) near the vending machine.
   - Selects a drink and confirms payment via Solana Pay (e.g., transfer USDC to machine's treasury PDA).
   - App includes a unique `referenceId` (UUID) as a memo in the transaction.

2. **Backend Detection & Voucher Creation**:
   - Backend polls Solana RPC for incoming transfers to the treasury.
   - Matches memo to a pending purchase record in MongoDB.
   - Generates a 4-digit OTP, hashes it (Keccak-256), stores hash/expiry in DB.
   - Creates an on-chain **Voucher PDA** (Program-Derived Address) with:
     - User's wallet address.
     - OTP hash.
     - Expiry timestamp (e.g., 1 hour).
     - Nonce for uniqueness.
   - Sends OTP via push notification (e.g., Firebase) to user's app.

3. **Redemption at Machine**:
   - User inputs OTP on the vending machine's touchscreen/keyboard.
   - Machine sends raw OTP to backend via secure HTTP POST.
   - Backend re-hashes input and compares to stored hash.
   - If match: Backend calls `redeemVoucher` on-chain (marks as redeemed, emits event).
   - Machine dispenses drink; increments user's purchase count in **UserProgress PDA**.

4. **Loyalty Rewards**:
   - After 10 purchases, owner mints an NFT to user's wallet via `setNftMint`.
   - User redeems NFT at machine for a free drink (resets progress via `resetProgress`).

### 2. Data Marketplace (Business Insights)
1. **Purchase Report**:
   - Business uses app/API to buy a report (Daily: 1 USDC, Weekly: 5 USDC, Monthly: 20 USDC).
   - Pays to treasury PDA; backend detects via polling, creates **Report PDA** with details (type, timeframe, buyer).

2. **Report Preparation**:
   - Owner uploads aggregated data (e.g., anonymized sales trends) to IPFS; attaches CID via `attachReportData`.
   - Generates Merkle tree of distributions (pro-rata shares for opted-in users).
   - Submits root via `submitDistributionRoot`.

3. **Fair Distribution**:
   - 10% to owner; 90% to opted-in users based on contributions (e.g., purchase volume).
   - Users query backend for their Merkle proof (via claimant wallet).
   - Claim via `claimEarnings`: Verify proof on-chain, transfer tokens from treasury.

### Error Handling & Edge Cases
- **Expired OTP/Voucher**: Rejects redemption; user retries purchase.
- **Double-Spend**: On-chain checks prevent duplicate redemptions.
- **Network Issues**: Machines queue requests; backend retries failed txns.
- **Opt-In Privacy**: Users toggle data sharing in app; only aggregated stats sold.

## 💡 Benefits

### For Users (Consumers)
- **Seamless Crypto Payments**: Pay with SOL/USDC in seconds, no cash or cards.
- **Rewards & Incentives**: Free drinks via NFTs; passive earnings from data shares (if opted-in).
- **Privacy-First**: OTPs are hashed; no personal data exposed on-chain.
- **Global Accessibility**: Works with any Solana wallet; low fees (~$0.00025/tx).

### For Machine Owners
- **Automated Ops**: No cash collection; real-time sales tracking via Solana explorer.
- **Revenue Streams**: Drink sales + 10% data cut + NFT minting fees.
- **Scalable Insights**: Easy data export for business optimization.
- **Low Overhead**: Solana's speed handles high-volume vending (1000s TPS).

### For Businesses
- **Actionable Data**: Granular insights (e.g., peak hours, popular drinks) without privacy violations.
- **Fair Economics**: Transparent distributions via Merkle proofs, no middleman skims.
- **Customizable**: Buy exactly what you need (daily trends for $1, monthly for $20).

### Overall Ecosystem
- **Sustainability**: Tokenized incentives encourage repeat use and data opt-ins.
- **Inclusivity**: Bridges crypto adoption to everyday purchases.
- **Security**: Auditable smart contracts; resistant to fraud via PDAs and proofs.

## 🛠️ What It Solves

Traditional vending machines suffer from:
- **Operational Friction**: Cash jams, manual collections, theft risks (global losses: $8B/year).
- **Poor User Experience**: Limited payment options; no loyalty programs.
- **Data Silos**: Owners can't monetize insights; users get no value from their habits.
- **Scalability Limits**: High fees/latency in legacy systems.

Solvend addresses these with:
- **Crypto-Native Efficiency**: Instant, borderless payments on Solana.
- **Decentralized Trust**: On-chain vouchers/NFTs eliminate disputes.
- **Monetized Data Economy**: Turns "waste" data into shared value, fostering a circular economy.
- **Future-Proof Design**: Extensible to EVs, laundromats, or IoT devices.

In a world shifting to Web3, Solvend makes physical commerce as fluid as digital, democratizing access while rewarding participation.

## 🏗️ System Architecture

Solvend is a full-stack dApp with on-chain (Solana) and off-chain (Node.js/MongoDB) components. It uses a **hybrid model**: Critical logic (payments, claims) on-chain for immutability; user-facing flows (OTP, notifications) off-chain for speed.

### Components
| Component | Tech | Role |
|-----------|------|------|
| **Smart Contract** | Rust + Anchor | Core PDAs: Vouchers, UserProgress, Reports, Treasury. Handles purchases, redemptions, claims. |
| **Backend API** | Node.js + TypeScript + Express | Listens for txns, manages DB, signs admin txns (e.g., voucher creation). Routes: `/purchase`, `/report`, `/claim-proof`. |
| **Database** | MongoDB | Off-chain state: Purchases, Reports, OTP hashes, Merkle proofs. |
| **Frontend/App** | (Assumed: React Native/Web3.js) | User interface for purchases; integrates Solana Pay. |
| **Vending Machine** | Hardware (Raspberry Pi + Touchscreen) + HTTP Client | Dispenses items; sends OTPs to backend. |
| **Notifications** | Firebase (or similar) | Push OTPs/emails. |
| **Off-Chain Tools** | IPFS (data storage), Keccak-256 (hashing) | Decentralized reports; secure OTPs. |

### Data Flow Diagram (Tree Structure)

#### Consumer Drink Purchases Flow
```
User Initiates Purchase
├── Mobile App: Select Drink & Pay via Solana Pay (USDC Tx + Memo referenceId)
│   └── Solana RPC: Receives Transaction
├── Backend Listener: Polls & Detects Tx
│   ├── Matches Memo to Pending Purchase in MongoDB
│   ├── Generates OTP, Hashes (Keccak-256), Stores in DB
│   └── Creates On-Chain Voucher PDA
│       ├── User Wallet Address
│       ├── OTP Hash
│       ├── Expiry Timestamp (1 Hour)
│       └── Nonce
├── Notification Service: Pushes OTP to User App
├── User Inputs OTP on Vending Machine
│   └── Machine: Sends Raw OTP to Backend via HTTP
├── Backend Validator: Re-Hashes Input & Compares to DB
│   ├── If Match:
│   │   ├── Calls redeemVoucher On-Chain (Marks Redeemed, Emits Event)
│   │   ├── Dispenses Drink
│   │   └── Increments UserProgress PDA (Purchase Count)
│   └── If Mismatch: Rejects Redemption
└── Loyalty Check (After 10 Purchases)
    ├── Owner Mints NFT via setNftMint
    └── User Redeems NFT for Free Drink (Resets Progress via resetProgress)
```

#### Data Marketplace Flow
```
Business Purchases Report
├── App/API: Buy Report (Daily/Weekly/Monthly) via Tx to Treasury PDA
│   └── Backend Listener: Detects Tx, Creates Report PDA (Type, Timeframe, Buyer)
├── Owner Prepares Report
│   ├── Uploads Aggregated Data to IPFS
│   │   └── Attaches CID via attachReportData On-Chain
│   ├── Generates Merkle Tree (Pro-Rata Shares for Opted-In Users)
│   └── Submits Root via submitDistributionRoot (Status: DistributionReady)
├── User Queries Backend for Proof
│   └── Backend: Returns Merkle Proof (Via Claimant Wallet)
└── User Claims Earnings
    ├── Builds Claim Tx with Proof
    ├── Verifies On-Chain (claimEarnings: Merkle Proof Check)
    └── Transfers Tokens from Treasury (90% to Users, 10% to Owner)
```

- **Security**: PDAs for deterministic addresses; signer checks for authority. Merkle proofs prevent over-claims.
- **Scalability**: Solana handles 65k TPS; backend polls efficiently (4s intervals).
- **Deployment**: Devnet for testing; mainnet for prod. Env vars: `PROGRAM_ID`, `USDC_MINT`, `MONGO_URI`.

## 🚀 Quick Start

1. **Clone & Setup**:
   ```
   git clone <repo>
   cd backend
   npm install
   cp .env.example .env  # Fill with Solana RPC, keys, etc.
   ```

2. **Deploy Smart Contract**:
   - Use Anchor: `anchor build && anchor deploy --provider.cluster devnet`.

3. **Run Backend**:
   ```
   npm run dev  # Starts API on :3000, listeners for payments/reports.
   ```

4. **Test Flow**:
   - Create purchase: `POST /api/purchase/create {userWallet, amount}`.
   - Simulate txn; watch listener create voucher.
   - Redeem: `POST /api/validate-otp {otp}`.

For full docs, see `/docs/` folder. Hardware integration guide coming soon.

## 🤝 Contributing

- Fork & PR for features/bugs.
- Issues: Report smart contract vulns or UX gaps.

## 📄 License

MIT © Solvend Team. See [LICENSE](LICENSE) for details.

---

*Built with ❤️ for a decentralized future. Questions? Open an issue!*