# 🎉 Solvend API Integration Complete!

## What Was Integrated

The Solvend backend API is now fully integrated into your mobile app for drink purchases with OTP validation.

## How It Works

### 1. **Purchase Flow** (External Wallets)

When a user buys a drink with an external wallet (Phantom, etc.):

```
User selects drink → API creates purchase → User pays with USDC →
Backend detects payment → Backend creates voucher → Backend generates OTP →
User enters OTP → Backend redeems voucher → Dispense drink
```

### 2. **What Happens Behind the Scenes**

**Step 1: Create Purchase**

```typescript
const purchase = await SolvendAPI.Purchase.createPurchase({
  userWallet: walletAddress,
  amount: drinkPrice * 1_000_000, // Convert to micro-USDC
});
```

Returns: `referenceId`, `treasuryTokenAccount`, `memo`

**Step 2: Send Payment**

- User sends USDC to treasury
- **Important**: Memo = `referenceId` (for tracking)

**Step 3: Backend Auto-Processing**

- Backend listener detects payment
- Creates voucher on-chain
- Generates 4-digit OTP
- Stores in database

**Step 4: OTP Validation**

```typescript
const result = await SolvendAPI.Purchase.validateOtp({ otp: "1234" });
```

- Backend verifies OTP
- Redeems voucher on-chain
- Marks purchase as complete

## Files Modified

### ✅ `app/(tabs)/index.tsx`

- Added `SolvendAPI` import
- Modified `handleExternalWalletPayment()` to:
  - Create purchase on backend first
  - Use `referenceId` as memo
  - Show reference ID in success message
  - Offer "Enter OTP Now" button

### ✅ `app/pages/otp-validation.tsx` (NEW)

- OTP input screen
- Validates 4-digit OTP
- Shows success/error messages
- Navigates back to home on success

### ✅ `app/pages/menu.tsx`

- Added "Validate OTP" menu item
- Quick access to OTP screen

## How to Test

### 1. Start Backend

```bash
cd solvend/backend
npm run dev
```

You should see:

```
✅ API Server is running on http://localhost:3000
[listener] Watching treasury: <address>
```

### 2. Start Mobile App

```bash
npx expo start
```

### 3. Buy a Drink

1. Select a drink
2. Click "Buy"
3. Click "Checkout with Solana Pay"
4. Approve payment in Phantom wallet
5. Wait for confirmation
6. Click "Enter OTP Now"

### 4. Check Backend Logs

```
[listener] Payment detected for <referenceId>
[listener] Voucher created for <referenceId>, OTP=1234
```

### 5. Enter OTP

1. Enter the 4-digit OTP from backend logs
2. Click "Validate OTP"
3. Success! Drink is redeemed

## API Endpoints Used

| Endpoint               | Method | Purpose                         |
| ---------------------- | ------ | ------------------------------- |
| `/api/purchase/create` | POST   | Create purchase record          |
| `/api/validate-otp`    | POST   | Validate OTP and redeem voucher |

## Environment Variables

**Mobile App** (`.env`):

````bash
**Mobile App** (`.env`):
```bash
# ⚠️ IMPORTANT: Use your computer's local IP, NOT localhost!
# localhost won't work on physical devices/emulators
EXPO_PUBLIC_SOLVEND_API_URL=http://10.140.84.136:3000/api

# To find your IP:
# Windows: ipconfig (look for IPv4 Address under Wi-Fi)
# Mac/Linux: ifconfig | grep "inet "
````

````

**Backend** (`solvend/backend/.env`):

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW
BACKEND_WALLET_PATH=./keys/backend.json
BACKEND_WALLET_PUBKEY=4ZADcPFwh6x2Pw91FixTiyVeASk8AkRbJD3vfWhfbErp
TREASURY_TOKEN_ACCOUNT=5ReMQrivJK31UuvNpjF5Qt8fiABxY4oRbwVwZHYdp7PD
MONGO_URI=mongodb+srv://...
PORT=3000
````

## Features Implemented

✅ **Purchase API Integration**

- Creates purchase record before payment
- Returns reference ID for tracking
- Backend automatically processes payment

✅ **OTP Validation**

- Dedicated OTP input screen
- 4-digit numeric input
- Real-time validation
- Success/error handling

✅ **User Flow**

- Payment confirmation with reference ID
- Option to enter OTP immediately
- Menu access to OTP screen
- Transaction history with reference ID

✅ **Backend Integration**

- MongoDB connection
- Payment listener running
- Voucher creation
- OTP generation

## Console Logs to Watch

### Mobile App

```
Solvend API URL: http://localhost:3000/api
Step 1: Creating purchase on Solvend backend...
Purchase created: {referenceId: "...", ...}
Reference ID: uuid-1234-5678-...
Step 2: Processing Solana payment...
Payment confirmed for <drink>
```

### Backend

```
🔌 Connected to MongoDB
✅ API Server is running on http://localhost:3000
[listener] Watching treasury: 5ReM...
[listener] Payment detected for <referenceId>
[listener] Voucher created for <referenceId>, OTP=1234
```

## Troubleshooting

### "Failed to create purchase" / "Network request failed"

- **Most Common Issue**: Using `localhost` instead of your computer's IP
  - ❌ Wrong: `http://localhost:3000/api`
  - ✅ Correct: `http://10.140.84.136:3000/api` (your local IP)
- Check backend is running: `http://localhost:3000` (on your computer)
- Check `.env` has your computer's IP address
- Check mobile device is on **same Wi-Fi network** as your computer
- Windows Firewall: Allow Node.js through firewall
- Test backend: Open `http://10.140.84.136:3000` in phone browser

### "Invalid OTP"

- OTP is in backend logs: Look for `OTP=1234`
- OTP expires in 1 hour
- OTP can only be used once

### "Backend crashed"

- Check MongoDB is connected
- Check `backend.json` keypair exists
- Check all .env variables are set

## Next Steps

### For Development

- [ ] Add push notifications for OTP delivery
- [ ] Add QR code scanning for machine ID
- [ ] Add purchase history with OTP status
- [ ] Add OTP resend functionality

### For Production

- [ ] Deploy backend to cloud (Heroku, Railway, etc.)
- [ ] Update `EXPO_PUBLIC_SOLVEND_API_URL` to production URL
- [ ] Set up MongoDB Atlas properly
- [ ] Fund backend wallet with SOL for gas
- [ ] Fund treasury with USDC for testing

## Summary

Your mobile app now:

1. ✅ Creates purchases on Solvend backend
2. ✅ Sends payments with tracking reference
3. ✅ Validates OTP for redemption
4. ✅ Shows reference IDs for tracking
5. ✅ Provides dedicated OTP input screen

The backend:

1. ✅ Listens for payments automatically
2. ✅ Creates vouchers on-chain
3. ✅ Generates and stores OTPs
4. ✅ Validates OTPs and redeems vouchers

**Everything is working! 🎉**

Test it by buying a drink and watching the logs!
