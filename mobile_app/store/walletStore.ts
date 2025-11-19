import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface WalletState {
  // Wallet data
  walletAddress: string | null;
  balance: number;
  isConnected: boolean;
  walletType: "embedded" | "external" | null;

  // User data
  userName: string | null;
  userEmail: string | null;
  userId: string | null;
  userProfilePicture: string | null; // URI or URL to profile picture
  isAuthenticated: boolean; // Track if user has authenticated before

  // Connected external wallet (Solana Mobile Wallet Adapter)
  connectedWallet: string | null;

  // Pin/Security
  hasPin: boolean;
  biometricsEnabled: boolean;

  // Actions
  setWalletAddress: (address: string | null) => void;
  setBalance: (balance: number) => void;
  addBalance: (amount: number) => void;
  deductBalance: (amount: number) => void;
  setConnected: (connected: boolean) => void;
  setWalletType: (type: "embedded" | "external" | null) => void;
  setUserName: (name: string | null) => void;
  setUserEmail: (email: string | null) => void;
  setUserId: (id: string | null) => void;
  setUserProfilePicture: (uri: string | null) => void;
  setConnectedWallet: (wallet: string | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setHasPin: (hasPin: boolean) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  disconnectWallet: () => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      walletAddress: null,
      balance: 0,
      isConnected: false,
      walletType: null,
      userName: null,
      userEmail: null,
      userId: null,
      userProfilePicture: null,
      isAuthenticated: false,
      connectedWallet: null,
      hasPin: false,
      biometricsEnabled: false,

      // Actions
      setWalletAddress: (address) => set({ walletAddress: address }),

      setBalance: (balance) => set({ balance }),

      addBalance: (amount) =>
        set((state) => ({
          balance: state.balance + amount,
        })),

      deductBalance: (amount) => {
        const currentBalance = get().balance;
        if (currentBalance >= amount) {
          set({ balance: currentBalance - amount });
          return true;
        }
        return false;
      },

      setConnected: (connected) => set({ isConnected: connected }),
      setWalletType: (type) => set({ walletType: type }),
      setUserName: (name) => set({ userName: name }),
      setUserEmail: (email) => set({ userEmail: email }),
      setUserId: (id) => set({ userId: id }),
      setUserProfilePicture: (uri) => set({ userProfilePicture: uri }),
      setConnectedWallet: (wallet) => set({ connectedWallet: wallet }),
      setAuthenticated: (authenticated) =>
        set({ isAuthenticated: authenticated }),
      setHasPin: (hasPin) => set({ hasPin }),
      setBiometricsEnabled: (enabled) => set({ biometricsEnabled: enabled }),

      disconnectWallet: () =>
        set({
          walletAddress: null,
          connectedWallet: null,
          isConnected: false,
          walletType: null,
          isAuthenticated: false,
        }),

      reset: () =>
        set({
          walletAddress: null,
          balance: 0,
          isConnected: false,
          walletType: null,
          userName: null,
          userEmail: null,
          userId: null,
          userProfilePicture: null,
          isAuthenticated: false,
          connectedWallet: null,
          hasPin: false,
          biometricsEnabled: false,
        }),
    }),
    {
      name: "solvend-wallet-storage",
      storage: createJSONStorage(() => ({
        setItem: async (name, value) => {
          const state = JSON.parse(value);
          // Only store wallet address in the root storage
          await AsyncStorage.setItem(
            name,
            JSON.stringify({
              state: { walletAddress: state.state.walletAddress },
              version: state.version,
            })
          );

          // If we have a wallet address, store user-specific data
          if (state.state.walletAddress) {
            const userKey = `${name}-${state.state.walletAddress}`;
            await AsyncStorage.setItem(userKey, value);
          }
        },
        getItem: async (name) => {
          const baseData = await AsyncStorage.getItem(name);
          if (!baseData) return null;

          const { state } = JSON.parse(baseData);
          if (!state.walletAddress) return baseData;

          // If we have a wallet address, try to get user-specific data
          const userKey = `${name}-${state.walletAddress}`;
          const userData = await AsyncStorage.getItem(userKey);
          return userData || baseData;
        },
        removeItem: async (name) => {
          const baseData = await AsyncStorage.getItem(name);
          if (baseData) {
            const { state } = JSON.parse(baseData);
            if (state.walletAddress) {
              // Remove user-specific data
              const userKey = `${name}-${state.walletAddress}`;
              await AsyncStorage.removeItem(userKey);
            }
          }
          await AsyncStorage.removeItem(name);
        },
      })),
    }
  )
);
