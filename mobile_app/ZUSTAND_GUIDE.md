# Zustand State Management Guide

## Overview

This app uses Zustand for state management with AsyncStorage persistence. All state is automatically saved and restored across app sessions.

## Available Stores

### 1. Theme Store (`useThemeStore`)

Manages dark/light mode and color schemes.

```typescript
import { useThemeStore } from "@/store/themeStore";

// Usage
const { isDarkMode, colors, toggleTheme, setTheme } = useThemeStore();

// Toggle between dark and light mode
toggleTheme();

// Set specific theme
setTheme(true); // Dark mode
setTheme(false); // Light mode

// Access colors
colors.background;
colors.card;
colors.text;
colors.textSecondary;
colors.primary;
colors.secondary;
colors.accent;
colors.border;
colors.success;
colors.error;
colors.warning;
```

### 2. Wallet Store (`useWalletStore`)

Manages wallet data and user information.

```typescript
import { useWalletStore } from "@/store/walletStore";

// Usage
const {
  walletAddress,
  balance,
  isConnected,
  setBalance,
  addBalance,
  deductBalance,
  disconnectWallet,
} = useWalletStore();

// Update balance
setBalance(1000);

// Add funds
addBalance(500); // balance becomes 1500

// Deduct funds
deductBalance(200); // balance becomes 1300

// Disconnect wallet
disconnectWallet();
```

### 3. Transaction Store (`useTransactionStore`)

Manages transaction history.

```typescript
import { useTransactionStore } from "@/store/transactionStore";

// Usage
const {
  transactions,
  addTransaction,
  getRecentTransactions,
  getTotalSpent,
  getTotalEarned,
} = useTransactionStore();

// Add a new transaction
addTransaction({
  type: "debit", // or 'credit'
  category: "purchase", // 'topup', 'reward', 'transfer'
  amount: 200,
  status: "completed", // 'pending', 'failed'
  description: "Cola Purchase",
});

// Get recent transactions
const recent = getRecentTransactions(10); // Last 10 transactions

// Get totals
const totalSpent = getTotalSpent();
const totalEarned = getTotalEarned();
```

### 4. Settings Store (`useSettingsStore`)

Manages app settings and preferences.

```typescript
import { useSettingsStore } from "@/store/settingsStore";

// Usage
const {
  notifications,
  biometrics,
  currency,
  setNotifications,
  setBiometrics,
  setCurrency,
} = useSettingsStore();

// Update settings
setNotifications(true);
setBiometrics(false);
setCurrency("NGN"); // 'USD', 'SOL'
```

## Benefits

✅ **Persistent State** - All data saved to AsyncStorage automatically
✅ **Type Safety** - Full TypeScript support
✅ **Performance** - Only re-renders components using changed state
✅ **Simple API** - No boilerplate, easy to use
✅ **Web3 Ready** - Designed for blockchain applications

## Current Implementation

### Screens Using Zustand:

- ✅ **Splash Screen** - Theme awareness
- ✅ **Menu Screen** - Dark/light mode toggle with Zustand
- ✅ **Home Screen** - Wallet balance and transactions
- ✅ **Top-up Screen** - Add funds to wallet

### Migration Complete:

The app has been fully migrated from Context API to Zustand with the following improvements:

1. **Better Performance** - Zustand is more optimized than Context API
2. **Persistence** - State automatically saves to AsyncStorage
3. **Type Safety** - Full TypeScript support throughout
4. **Web3 UI** - Modern gradient-based design with dark/light themes
5. **Cleaner Code** - Less boilerplate, more maintainable

## Splash Screen Behavior

The splash screen only shows on the first app launch. On subsequent launches:

- **Authenticated users** → Redirected to home screen (`/(tabs)`)
- **Non-authenticated users** → Redirected to login screen (`/pages/LoginScreen`)

### Reset Splash Screen (For Testing)

```typescript
import { resetSplashScreen } from "@/utils/splashUtils";

// Reset splash screen to show again on next launch
await resetSplashScreen();
```

The splash screen status is stored in AsyncStorage using the key `@solvend_splash_seen`.

## Next Steps

1. Integrate Zustand stores with Privy authentication
2. Connect external wallet addresses to wallet store
3. Implement real transaction history from blockchain
4. Add biometric authentication
5. Implement notifications system
