# Solana Pay Integration Guide

## Overview

Your app now supports two payment methods:

- **External Wallets**: Pay using Solana blockchain transactions (USDC)
- **Embedded Wallets**: Pay using balance deduction with PIN verification

## Configuration Required

### Set Merchant Wallet Address

Open `utils/solanaPayUtils.ts` and replace the placeholder:

```typescript
const MERCHANT_WALLET = "YOUR_MERCHANT_WALLET_ADDRESS_HERE";
```

Replace with your actual Solana wallet address where you want to receive USDC payments (e.g., from Phantom, Solflare, or any Solana wallet).

## How It Works

### External Wallet Payment Flow

1. User selects a drink
2. Taps "Pay from Wallet"
3. Confirmation alert shows payment details
4. User approves → wallet app opens
5. User signs transaction in wallet
6. App confirms transaction on blockchain
7. Success alert shows → balance refreshes

### Embedded Wallet Payment Flow

1. User selects a drink
2. Taps "Pay from Wallet"
3. PIN modal appears
4. User enters 4-digit PIN
5. Balance deducted → transaction added to history

## Key Features Implemented

✅ **Dual Payment System**: Automatically detects wallet type and uses appropriate payment method

✅ **Blockchain Transactions**: External wallets pay directly on Solana mainnet

✅ **Transaction Confirmation**: Polls blockchain for confirmation (up to 30 retries)

✅ **Error Handling**: Comprehensive error messages for transaction failures

✅ **Balance Refresh**: Automatically refreshes USDC/SOL balances after payment

✅ **Transaction History**: Logs all purchases with proper descriptions

## Files Modified

### `app/(tabs)/index.tsx`

- Added `handleExternalWalletPayment()` function
- Modified `handlePayFromWallet()` to check wallet type
- Added MWA transaction signing
- Added blockchain confirmation polling
- Preserved PIN flow for embedded wallets

### `utils/solanaPayUtils.ts` (NEW)

- `createUSDCPaymentTransaction()` - Creates SPL token transfer
- `confirmTransaction()` - Waits for blockchain confirmation
- `generateReference()` - Creates unique tracking ID
- `estimateTransactionFee()` - Calculates transaction cost
- Helper functions for transaction management

## Testing

### Test External Wallet Payment

1. Login with Solana Mobile Wallet Adapter (external wallet)
2. Ensure wallet has USDC balance
3. Select any drink
4. Tap "Pay from Wallet"
5. Approve payment confirmation
6. Sign transaction in wallet app
7. Wait for confirmation alert

### Test Embedded Wallet Payment

1. Login with Privy (email/social)
2. Ensure wallet has sufficient balance
3. Select any drink
4. Tap "Pay from Wallet"
5. Enter 4-digit PIN
6. Verify balance deduction

## Technical Details

### Network

- **RPC**: https://api.mainnet-beta.solana.com
- **Cluster**: mainnet-beta
- **Token**: USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)

### Transaction Structure

```typescript
{
  sender: User's wallet PublicKey
  recipient: Merchant wallet PublicKey
  amount: Price in USDC (e.g., 0.0000001)
  token: USDC SPL Token
  reference: Unique PublicKey for tracking
}
```

### Confirmation Settings

- Max retries: 30
- Retry interval: 1 second
- Total timeout: ~30 seconds

## Troubleshooting

### Payment Not Confirming

- Check network connection
- Ensure sufficient USDC balance
- Verify SOL balance for gas fees (~0.000005 SOL per transaction)

### Transaction Fails

- Check wallet has enough USDC + SOL for fees
- Verify merchant wallet address is correct
- Check RPC endpoint availability

### Wallet Not Connecting

- Ensure Mobile Wallet Adapter wallet app is installed
- Check wallet app is updated to latest version
- Try disconnecting and reconnecting

## Next Steps

1. **Configure Merchant Wallet**: Replace placeholder in `solanaPayUtils.ts`
2. **Test Payments**: Try both wallet types with small amounts
3. **Monitor Transactions**: Check merchant wallet for received payments
4. **Optimize**: Adjust confirmation timeout if needed
5. **Analytics**: Track payment success rates

## Security Notes

⚠️ **Important**:

- Transactions are irreversible once confirmed
- Always verify merchant wallet address before deploying
- Keep merchant private keys secure
- Test thoroughly on devnet before using mainnet
- Monitor for failed transactions and handle refunds manually if needed

## Support

For issues or questions:

- Check Solana status: https://status.solana.com
- Solana docs: https://docs.solana.com
- Mobile Wallet Adapter: https://docs.solanamobile.com
