import AsyncStorage from "@react-native-async-storage/async-storage";

const SPLASH_SEEN_KEY = "@solvend_splash_seen";

/**
 * Reset splash screen status - useful for testing
 * After calling this, the splash screen will show again on next app launch
 */
export const resetSplashScreen = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SPLASH_SEEN_KEY);
    console.log("✅ Splash screen reset - will show on next launch");
  } catch (error) {
    console.error("❌ Error resetting splash screen:", error);
  }
};

/**
 * Check if user has seen the splash screen
 */
export const hasSplashBeenSeen = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(SPLASH_SEEN_KEY);
    return value === "true";
  } catch (error) {
    console.error("Error checking splash status:", error);
    return false;
  }
};

/**
 * Mark splash screen as seen
 */
export const markSplashAsSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(SPLASH_SEEN_KEY, "true");
    console.log("✅ Splash screen marked as seen");
  } catch (error) {
    console.error("❌ Error marking splash as seen:", error);
  }
};
