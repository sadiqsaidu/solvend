import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Modern Web3-inspired color palettes
export const lightColors = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#64748B",
  primary: "#7680BC",
  secondary: "#00C4F4",
  accent: "#14F195",
  border: "#E2E8F0",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  cardGradientStart: "#FFFFFF",
  cardGradientEnd: "#F1F5F9",
  glass: "rgba(255, 255, 255, 0.1)",
};

export const darkColors = {
  background: "#0B1120",
  card: "#131C2F",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  primary: "#7680BC",
  secondary: "#00C4F4",
  accent: "#14F195",
  border: "#1E293B",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  cardGradientStart: "#1E293B",
  cardGradientEnd: "#0F172A",
  glass: "rgba(255, 255, 255, 0.05)",
};

interface ThemeState {
  isDarkMode: boolean;
  colors: typeof darkColors;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: true, // Default to dark mode for Web3 aesthetic
      colors: darkColors,

      toggleTheme: () => {
        const newIsDark = !get().isDarkMode;
        set({
          isDarkMode: newIsDark,
          colors: newIsDark ? darkColors : lightColors,
        });
      },

      setTheme: (isDark: boolean) => {
        set({
          isDarkMode: isDark,
          colors: isDark ? darkColors : lightColors,
        });
      },
    }),
    {
      name: "solvend-theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
