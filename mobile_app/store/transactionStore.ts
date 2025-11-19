import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useWalletStore } from "./walletStore";

export interface Transaction {
  id: string;
  type: "credit" | "debit";
  category: "purchase" | "topup" | "reward" | "transfer";
  amount: number;
  date: Date;
  timestamp: number;
  status: "pending" | "completed" | "failed";
  description: string;
  txHash?: string;
  recipient?: string;
}

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (
    transaction: Omit<Transaction, "id" | "date" | "timestamp">
  ) => void;
  updateTransactionStatus: (id: string, status: Transaction["status"]) => void;
  clearTransactions: () => void;
  getRecentTransactions: (limit?: number) => Transaction[];
  getTotalSpent: () => number;
  getTotalEarned: () => number;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          date: new Date(),
          timestamp: Date.now(),
        };

        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
        }));
      },

      updateTransactionStatus: (id, status) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, status } : tx
          ),
        })),

      clearTransactions: () => set({ transactions: [] }),

      getRecentTransactions: (limit = 10) => {
        return get()
          .transactions.sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
      },

      getTotalSpent: () => {
        return get()
          .transactions.filter(
            (tx) => tx.type === "debit" && tx.status === "completed"
          )
          .reduce((total, tx) => total + tx.amount, 0);
      },

      getTotalEarned: () => {
        return get()
          .transactions.filter(
            (tx) => tx.type === "credit" && tx.status === "completed"
          )
          .reduce((total, tx) => total + tx.amount, 0);
      },
    }),
    {
      name: "solvend-transaction-storage",
      storage: createJSONStorage(() => ({
        setItem: async (name, value) => {
          // Get current wallet address from wallet store
          const walletAddress = useWalletStore.getState().walletAddress;
          if (!walletAddress) {
            console.log(
              "No wallet address available, skipping transaction storage"
            );
            return;
          }

          // Store transactions under user-specific key
          const userKey = `${name}-${walletAddress}`;
          await AsyncStorage.setItem(userKey, value);
        },
        getItem: async (name) => {
          // Get current wallet address from wallet store
          const walletAddress = useWalletStore.getState().walletAddress;
          if (!walletAddress) {
            console.log(
              "No wallet address available, returning empty transactions"
            );
            return JSON.stringify({ state: { transactions: [] }, version: 0 });
          }

          // Get transactions from user-specific storage
          const userKey = `${name}-${walletAddress}`;
          const value = await AsyncStorage.getItem(userKey);
          return value;
        },
        removeItem: async (name) => {
          // Get current wallet address from wallet store
          const walletAddress = useWalletStore.getState().walletAddress;
          if (walletAddress) {
            // Remove user-specific transactions
            const userKey = `${name}-${walletAddress}`;
            await AsyncStorage.removeItem(userKey);
          }
        },
      })),
      // Custom serialization/deserialization to handle Date objects
      partialize: (state) => ({
        transactions: state.transactions.map((tx) => ({
          ...tx,
          date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
        })),
      }),
      // Restore Date objects when loading from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.transactions = state.transactions.map((tx) => ({
            ...tx,
            date: typeof tx.date === "string" ? new Date(tx.date) : tx.date,
          }));
        }
      },
    }
  )
);
