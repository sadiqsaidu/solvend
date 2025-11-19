# 🚀 Quick Start Guide - Solvend API Integration

## ✅ Step 1: Backend Setup (COMPLETED)

### Dependencies Installed

```bash
✓ npm install completed in solvend/backend
```

### Environment Files Created

- ✓ `solvend/backend/.env` - Backend configuration
- ✓ `.env` - Mobile app configuration

## 📋 Step 2: Configure Your Backend

### You Need To Provide:

1. **Backend Wallet Keypair** (Important!)
   - Create a wallet keypair: `solana-keygen new --outfile solvend/backend/keys/backend.json`
   - Or copy your existing keypair to `solvend/backend/keys/backend.json`
   - Update `.env` with the public key:
     ```
     BACKEND_WALLET_PUBKEY=<your_wallet_public_key>
     ```

2. **Treasury Token Account** (Important!)
   - This is where users send payments
   - Create a USDC token account for your backend wallet
   - Update in `.env`:
     ```
     TREASURY_TOKEN_ACCOUNT=<your_usdc_token_account>
     ```

3. **MongoDB** (Optional for testing)
   - Install MongoDB locally: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (free cloud): https://www.mongodb.com/cloud/atlas
   - Update MONGO_URI in `.env` if using Atlas

## 🔧 Step 3: Start the Backend Server

```bash
# In one terminal
cd solvend/backend
npm run dev
```

You should see:

```
✅ API Server is running on http://localhost:3000
🔌 Connected to MongoDB
[listener] Watching treasury: <treasury_address>
```

## 📱 Step 4: Use API in Your Mobile App

The API is ready to use! Here are 3 ways to integrate:

### Option A: Use the Example Functions

```typescript
import { completePurchaseFlow } from "@/utils/solvendExamples";

// In your drink purchase handler
const result = await completePurchaseFlow(
  walletAddress,
  drinkPrice,
  drinkName,
  sendPaymentFunction
);
```

### Option B: Use API Directly

```typescript
import { SolvendAPI } from "@/utils/solvend API";

// Create purchase
const purchase = await SolvendAPI.Purchase.createPurchase({
  userWallet: walletAddress,
  amount: drinkPrice * 1_000_000, // Convert to micro-USDC
});

// Send payment with memo = purchase.referenceId

// Validate OTP
const result = await SolvendAPI.Purchase.validateOtp({ otp: "1234" });
```

### Option C: Integrate in index.tsx

See the detailed examples in `utils/solvendExamples.ts`

## 🧪 Step 5: Test the Integration

### Test 1: Check Backend Health

```bash
curl http://localhost:3000/api/purchase/create \
  -H "Content-Type: application/json" \
  -d '{"userWallet":"test_wallet","amount":100000}'
```

### Test 2: Mobile App

1. Start your mobile app: `npx expo start`
2. Select a drink
3. Check the console logs for API calls
4. Backend should detect payment and create voucher

## 📊 Monitoring

### Backend Logs

Watch for:

- `[listener] Watching treasury:` - Payment listener is running
- `[listener] Payment detected for <referenceId>` - Payment received
- `[listener] Voucher created for <referenceId>, OTP=1234` - OTP generated

### Mobile App Logs

- `Solvend API URL: http://localhost:3000/api` - API configured
- `Create purchase error:` - Check backend is running
- `Payment sent:` - Solana transaction successful

## 🔍 Troubleshooting

### Backend Won't Start

1. Check MongoDB is running: `mongod --version`
2. Check .env file exists: `ls solvend/backend/.env`
3. Check dependencies: `npm install` in backend folder

### API Calls Failing

1. Verify `.env` has correct URL: `EXPO_PUBLIC_SOLVEND_API_URL=http://localhost:3000/api`
2. Check backend is running: Visit http://localhost:3000 in browser
3. Check network: Mobile device must be on same network as computer

### OTP Not Generated

1. Check backend logs for payment detection
2. Verify payment includes memo = referenceId
3. Check treasury account matches in .env

## 🎯 Next Steps

1. **Set up wallet and treasury** (see Step 2 above)
2. **Start backend server**: `cd solvend/backend && npm run dev`
3. **Start mobile app**: `npx expo start`
4. **Test a purchase**: Buy a drink and watch the logs!

## 📚 Documentation

- **API Reference**: See `SOLVEND_API_INTEGRATION.md`
- **Code Examples**: See `utils/solvendExamples.ts`
- **Backend Repo**: https://github.com/sadiqsaidu/solvend

## ⚡ Quick Commands

```bash
# Start backend
cd solvend/backend && npm run dev

# Start mobile app
npx expo start

# Check backend health
curl http://localhost:3000/api/purchase/create -d '{"userWallet":"test","amount":100}'

# View backend logs
cd solvend/backend && npm run dev | grep "listener"

# Generate test OTP (when backend running)
node solvend/backend/src/scripts/generate_otp.js <referenceId>
```

---

**You're all set! 🎉** The Solvend API is ready to use in your mobile app.
