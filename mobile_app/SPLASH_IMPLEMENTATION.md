# Splash Screen Implementation Guide

## Overview

The splash screen now implements a "show once" behavior that provides a smooth onboarding experience while respecting returning users' time.

## Features

### 1. Smart Navigation

- **First-time users**: See the full splash screen experience
- **Returning authenticated users**: Skip directly to home screen `/(tabs)`
- **Returning non-authenticated users**: Skip directly to login screen `/pages/LoginScreen`

### 2. Persistent State

Uses AsyncStorage to remember if the user has seen the splash screen:

- Storage Key: `@solvend_splash_seen`
- Value: `"true"` when splash has been seen

### 3. Loading State

Shows a loading indicator while:

- Checking AsyncStorage for splash status
- Waiting for Privy authentication to initialize
- Prevents flash of wrong screen

## How It Works

```typescript
// 1. On app launch, check if splash has been seen
const hasSeenSplash = await AsyncStorage.getItem(SPLASH_SEEN_KEY);

// 2. If seen before, navigate based on auth status
if (hasSeenSplash === "true") {
  if (user) {
    router.replace("/(tabs)"); // Authenticated
  } else {
    router.replace("/pages/LoginScreen"); // Not authenticated
  }
}

// 3. First time users see full splash
else {
  setShowSplash(true);
}
```

## User Flow

### First Time User

```
App Launch
    ↓
Splash Screen (animated)
    ↓
User clicks "GET STARTED" or "Skip"
    ↓
Mark as seen in AsyncStorage
    ↓
Navigate to appropriate screen
```

### Returning User

```
App Launch
    ↓
Check AsyncStorage (splash seen = true)
    ↓
Check authentication status
    ↓
Navigate immediately (no splash)
```

## Testing

### Reset Splash Screen

To test the splash screen again after seeing it:

```typescript
import { resetSplashScreen } from "@/utils/splashUtils";

// In a component or during development
await resetSplashScreen();

// Then restart the app
```

### Manual Reset

You can also manually clear AsyncStorage:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

await AsyncStorage.removeItem("@solvend_splash_seen");
```

### Using Chrome DevTools

1. Open Expo DevTools
2. Go to AsyncStorage
3. Delete the `@solvend_splash_seen` key

## Utility Functions

Located in `utils/splashUtils.ts`:

```typescript
// Reset splash to show again
await resetSplashScreen();

// Check if splash has been seen
const seen = await hasSplashBeenSeen();

// Manually mark as seen
await markSplashAsSeen();
```

## Navigation Routes

| User Status       | Destination   | Route                |
| ----------------- | ------------- | -------------------- |
| First-time        | Splash Screen | `/pages/splash`      |
| Authenticated     | Home Screen   | `/(tabs)`            |
| Not Authenticated | Login Screen  | `/pages/LoginScreen` |

## Implementation Details

### Key Components

1. **Splash Check Hook**
   - Runs when Privy is ready (`isReady`)
   - Reads from AsyncStorage
   - Determines navigation path

2. **Loading Screen**
   - Shows while checking splash status
   - Prevents flash of incorrect screen
   - Smooth user experience

3. **Get Started Button**
   - Marks splash as seen
   - Navigates based on auth status
   - Handles storage errors gracefully

4. **Skip Button**
   - Enabled for convenience
   - Same behavior as Get Started
   - Marks splash as seen

### Error Handling

The implementation includes robust error handling:

```typescript
try {
  await AsyncStorage.setItem(SPLASH_SEEN_KEY, "true");
  // Navigate...
} catch (error) {
  console.error("Error saving splash status:", error);
  // Still navigate even if storage fails
}
```

## Best Practices

### ✅ Do

- Use `router.replace()` instead of `router.push()` to prevent back navigation
- Check `isReady` from Privy before navigation
- Show loading state while checking
- Handle storage errors gracefully

### ❌ Don't

- Use `router.push()` - this allows users to go back to splash
- Navigate before Privy is ready
- Assume AsyncStorage will always work
- Skip error handling

## Customization

### Change Navigation Routes

Edit the navigation logic in `splash.tsx`:

```typescript
// Change authenticated user destination
if (user) {
  router.replace("/your/custom/route");
}

// Change non-authenticated user destination
else {
  router.replace("/your/login/route");
}
```

### Change Splash Duration

Modify the animation interval:

```typescript
const timer = setInterval(() => {
  // ...animations
  setCurrentScreen((prev) => (prev + 1) % splashScreens.length);
}, 4000); // Change this value (in milliseconds)
```

### Disable Splash Permanently

To disable the splash screen entirely during development:

```typescript
// In splash.tsx, add this at the top of the component
useEffect(() => {
  if (__DEV__) {
    handleGetStarted();
  }
}, []);
```

## Performance Considerations

- **AsyncStorage is async**: We show a loading state while checking
- **Privy initialization**: We wait for `isReady` before deciding
- **Smooth transitions**: Using `router.replace()` prevents jarring back navigation
- **Error resilience**: Even if storage fails, users can still navigate

## Future Enhancements

1. **Version-based Splash**: Show splash again when app updates
2. **Feature Tours**: Different splash sequences for different app sections
3. **A/B Testing**: Test different splash designs
4. **Analytics**: Track splash completion rates
5. **Skip Animation**: Allow instant skip on subsequent viewings

## Troubleshooting

### Splash Shows Every Time

- Check if AsyncStorage write is failing
- Verify key matches: `@solvend_splash_seen`
- Check console for error messages

### Wrong Screen After Splash

- Verify Privy authentication status
- Check `user` object in navigation logic
- Ensure routes exist in app structure

### App Hangs on Loading

- Check Privy initialization
- Verify `isReady` is becoming true
- Check for AsyncStorage errors

## Summary

✅ **Implemented**: Smart splash screen with "show once" behavior  
✅ **Persistent**: Uses AsyncStorage to remember user preference  
✅ **Smart Navigation**: Routes based on authentication status  
✅ **Error Handling**: Graceful fallbacks for storage failures  
✅ **Testing Tools**: Utility functions to reset splash screen

The splash screen now provides a polished, professional onboarding experience while respecting returning users' time! 🎉
