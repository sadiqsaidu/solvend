# Token Balance Display Guide

## Overview

This guide documents the implementation of USDC and SOL balance display for external wallet users in the Solvend vending machine app.

## Features

### Dual Balance System

The app now supports two different balance display modes:

1. **External Wallet (Solana Mobile Wallet Adapter)**
   - Displays real USDC balance
   - Displays real SOL balance
   - Fetched directly from Solana blockchain
   - Auto-refreshes every 30 seconds
   - Manual refresh button

2. **Embedded Wallet (Privy)**
   - Displays Naira balance
   - Traditional fiat-based system
   - Top-up functionality

## Implementation Details

### Files Modified

#### 1. `app/(tabs)/index.tsx`

**New Imports:**

```typescript
import { getWalletBalances } from "@/utils/solanaUtils";
import { PublicKey } from "@solana/web3.js";
```

**New State:**

```typescript
const [tokenBalances, setTokenBalances] = useState<{
  sol: number;
  usdc: number;
} | null>(null);
const [isLoadingBalances, setIsLoadingBalances] = useState(false);
```

**Balance Fetching:**

```typescript
const fetchTokenBalances = async () => {
  if (walletType === "external" && walletAddress) {
    setIsLoadingBalances(true);
    try {
      const publicKey = new PublicKey(walletAddress);
      const balances = await getWalletBalances(publicKey);
      setTokenBalances(balances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  }
};
```

**Auto-Refresh:**

```typescript
useEffect(() => {
  if (walletType === "external" && walletAddress) {
    fetchTokenBalances();

    // Refresh balances every 30 seconds
    const interval = setInterval(fetchTokenBalances, 30000);
    return () => clearInterval(interval);
  }
}, [walletType, walletAddress]);
```

**Conditional UI:**
The balance card now conditionally renders based on wallet type:

- External wallets: Shows USDC (primary) and SOL (secondary) balances
- Embedded wallets: Shows Naira balance

#### 2. `utils/solanaUtils.ts`

Created comprehensive Solana blockchain utilities:

**Key Functions:**

- `getSOLBalance(publicKey)` - Fetches native SOL balance
- `getUSDCBalance(publicKey)` - Fetches USDC SPL token balance
- `getWalletBalances(publicKey)` - Returns both balances

**Type Safety:**
All functions accept `string | PublicKey` for flexibility:

```typescript
export const getWalletBalances = async (
  walletPublicKey: string | PublicKey
): Promise<{ sol: number; usdc: number }>
```

### UI/UX Features

#### Loading States

- Shows spinner and "Loading balances..." text on initial load
- Refresh button shows visual feedback during refresh
- Graceful error handling with fallback display

#### Balance Display Format

- **USDC**: Displayed with 2 decimal places (e.g., "125.50 USDC")
- **SOL**: Displayed with 4 decimal places (e.g., "2.4567 SOL")
- USDC shown prominently as primary balance
- SOL shown as secondary balance

#### Refresh Button

- Located in top-right of balance card
- Disabled during loading to prevent multiple requests
- Visual opacity change when loading
- Manual refresh on demand

#### Wallet Type Indicator

- "Wallet Balance" for external wallets
- "Available Balance" for embedded wallets
- "SOLANA WALLET • SECURED" for external
- "EVEND WALLET • SECURED" for embedded

## Technical Architecture

### Balance Fetching Flow

```
User Connects External Wallet
        ↓
App Gets PublicKey
        ↓
fetchTokenBalances() Called
        ↓
Parallel RPC Calls:
  - getSOLBalance()
  - getUSDCBalance()
        ↓
Update tokenBalances State
        ↓
UI Re-renders with Balances
        ↓
Auto-refresh every 30s
```

### RPC Configuration

- **Network**: Mainnet Beta
- **Endpoint**: `https://api.mainnet-beta.solana.net`
- **USDC Mint**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

### Error Handling

- Network errors return 0 balances
- Missing token accounts return 0 USDC balance
- Console logging for debugging
- User sees "Unable to load balances" message

## Dependencies

### New Package Installed

```json
{
  "@solana/spl-token": "^0.4.12"
}
```

### Existing Dependencies Used

- `@solana/web3.js`: ^1.98.4
- `@solana-mobile/mobile-wallet-adapter-protocol-web3js`: ^2.2.5

## User Experience

### External Wallet Users

1. Connect wallet via Solana Mobile Wallet Adapter
2. See loading spinner immediately
3. Balances appear within 1-2 seconds
4. Can manually refresh anytime
5. Balances auto-update every 30 seconds
6. See both USDC and SOL in one view

### Embedded Wallet Users

- Experience unchanged
- Still see Naira balance
- Top-up functionality works as before
- Can add funds traditionally

## Performance Considerations

### Optimization Strategies

1. **Parallel Fetching**: SOL and USDC fetched simultaneously
2. **Efficient Polling**: 30-second intervals prevent excessive RPC calls
3. **Conditional Fetching**: Only fetch for external wallets
4. **State Management**: Minimal re-renders with proper useEffect dependencies

### RPC Call Frequency

- Initial load: 2 calls (SOL + USDC)
- Auto-refresh: 2 calls every 30 seconds
- Manual refresh: 2 calls on demand
- Average: ~4 calls per minute per user

## Future Enhancements

### Payment Integration

- [ ] Token selection for payment (USDC vs SOL)
- [ ] Price conversion to token amounts
- [ ] Transaction processing with selected token
- [ ] Transaction history with token details

### Additional Features

- [ ] Real-time price conversion (USD to SOL/USDC)
- [ ] Token price charts
- [ ] Transaction notifications
- [ ] Multi-token support (BONK, USDT, etc.)
- [ ] Stablecoin-only mode for merchants

### Performance Improvements

- [ ] Cache balances locally
- [ ] Websocket subscriptions for real-time updates
- [ ] Optimistic UI updates
- [ ] Background sync workers

## Testing Checklist

### Manual Testing

- [x] External wallet connection
- [x] Balance fetching on load
- [x] Manual refresh button
- [x] Auto-refresh timer
- [x] Loading states
- [x] Error handling
- [ ] Payment with USDC
- [ ] Payment with SOL
- [ ] Low balance scenarios
- [ ] Zero balance scenarios

### Edge Cases

- [ ] Network timeout handling
- [ ] RPC endpoint failures
- [ ] Missing token accounts
- [ ] Wallet disconnection during fetch
- [ ] Rapid wallet switching

## Security Considerations

### Read-Only Operations

- All balance fetches are read-only
- No private keys exposed
- No signing required for balance checks

### RPC Security

- Using public Solana RPC endpoint
- Consider rate limiting
- Fallback endpoints for redundancy

### Data Validation

- PublicKey validation before RPC calls
- Balance amount type checking
- Safe fallback to 0 on errors

## Troubleshooting

### Common Issues

**Balances show as 0:**

- Check wallet has actual USDC/SOL
- Verify RPC endpoint is accessible
- Check console for error messages

**Loading never completes:**

- Network connectivity issue
- RPC endpoint down
- Invalid wallet address

**Balances not refreshing:**

- Check interval is running
- Verify wallet still connected
- Check component mount state

## Support

For issues or questions:

1. Check console logs for error details
2. Verify wallet connection status
3. Test with known-good wallet address
4. Check Solana network status

## Changelog

### Version 1.0.0 (Current)

- ✅ Initial implementation
- ✅ SOL balance fetching
- ✅ USDC balance fetching
- ✅ Conditional UI based on wallet type
- ✅ Auto-refresh mechanism
- ✅ Manual refresh button
- ✅ Loading states
- ✅ Error handling
