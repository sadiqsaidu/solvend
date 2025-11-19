import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  colors: typeof lightColors | typeof darkColors;
}

// Web3-inspired color schemes
const lightColors = {
  primary: "#6366F1", // Indigo
  secondary: "#8B5CF6", // Purple
  accent: "#14F195", // Mint green
  background: "#FFFFFF",
  surface: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  error: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  gradient1: "#6366F1",
  gradient2: "#8B5CF6",
  gradient3: "#14F195",
};

const darkColors = {
  primary: "#818CF8", // Lighter indigo
  secondary: "#A78BFA", // Lighter purple
  accent: "#14F195", // Mint green
  background: "#0F172A",
  surface: "#1E293B",
  card: "#1E293B",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  border: "#334155",
  error: "#F87171",
  success: "#34D399",
  warning: "#FBBF24",
  gradient1: "#6366F1",
  gradient2: "#8B5CF6",
  gradient3: "#14F195",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme || "light");

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme) {
        setTheme(savedTheme as Theme);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem("theme", newTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const isDark = theme === "dark";
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
