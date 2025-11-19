import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useWalletStore } from "./walletStore";

interface AchievementState {
  purchaseProgress: number; // 0-100
  completedBottles: number;
  addPurchaseProgress: () => void;
  resetProgress: () => void;
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      purchaseProgress: 0,
      completedBottles: 0,

      addPurchaseProgress: () => {
        set((state) => {
          const newProgress = state.purchaseProgress + 10;
          if (newProgress >= 100) {
            // Reset progress and increment completed bottles
            return {
              purchaseProgress: 0,
              completedBottles: state.completedBottles + 1,
            };
          }
          return { purchaseProgress: newProgress };
        });
      },

      resetProgress: () => {
        set({ purchaseProgress: 0, completedBottles: 0 });
      },
    }),
    {
      name: "solvend-achievement-storage",
      storage: createJSONStorage(() => ({
        setItem: async (name, value) => {
          const walletAddress = useWalletStore.getState().walletAddress;
          if (!walletAddress) return;
          const userKey = `${name}-${walletAddress}`;
          await AsyncStorage.setItem(userKey, value);
        },
        getItem: async (name) => {
          const walletAddress = useWalletStore.getState().walletAddress;
          if (!walletAddress) {
            return JSON.stringify({
              state: { purchaseProgress: 0, completedBottles: 0 },
              version: 0,
            });
          }
          const userKey = `${name}-${walletAddress}`;
          const value = await AsyncStorage.getItem(userKey);
          return value;
        },
        removeItem: async (name) => {
          const walletAddress = useWalletStore.getState().walletAddress;
          if (walletAddress) {
            const userKey = `${name}-${walletAddress}`;
            await AsyncStorage.removeItem(userKey);
          }
        },
      })),
    }
  )
);
