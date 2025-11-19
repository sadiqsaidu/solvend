import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SettingsState {
  // Preferences
  notifications: boolean;
  biometrics: boolean;
  currency: "NGN" | "USD" | "SOL";
  language: "en" | "es" | "fr";
  soundEffects: boolean;
  hapticFeedback: boolean;

  // Privacy
  showBalance: boolean;
  requirePinForPayments: boolean;

  // Display
  compactMode: boolean;

  // Actions
  setNotifications: (enabled: boolean) => void;
  setBiometrics: (enabled: boolean) => void;
  setCurrency: (currency: "NGN" | "USD" | "SOL") => void;
  setLanguage: (language: "en" | "es" | "fr") => void;
  setSoundEffects: (enabled: boolean) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setShowBalance: (show: boolean) => void;
  setRequirePinForPayments: (require: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      notifications: true,
      biometrics: false,
      currency: "NGN",
      language: "en",
      soundEffects: true,
      hapticFeedback: true,
      showBalance: true,
      requirePinForPayments: true,
      compactMode: false,

      // Actions
      setNotifications: (enabled) => set({ notifications: enabled }),
      setBiometrics: (enabled) => set({ biometrics: enabled }),
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language }),
      setSoundEffects: (enabled) => set({ soundEffects: enabled }),
      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
      setShowBalance: (show) => set({ showBalance: show }),
      setRequirePinForPayments: (require) =>
        set({ requirePinForPayments: require }),
      setCompactMode: (compact) => set({ compactMode: compact }),

      resetSettings: () =>
        set({
          notifications: true,
          biometrics: false,
          currency: "NGN",
          language: "en",
          soundEffects: true,
          hapticFeedback: true,
          showBalance: true,
          requirePinForPayments: true,
          compactMode: false,
        }),
    }),
    {
      name: "solvend-settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
