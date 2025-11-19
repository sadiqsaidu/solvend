import React, { createContext, ReactNode, useContext, useState } from "react";

export interface Transaction {
  id: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  date: Date;
}

interface WalletContextType {
  balance: number;
  transactions: Transaction[];
  addFunds: (amount: number, description: string) => void;
  deductFunds: (amount: number, description: string) => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addFunds = (amount: number, description: string) => {
    setBalance((prev) => prev + amount);
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: "credit",
      amount,
      description,
      date: new Date(),
    };
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const deductFunds = (amount: number, description: string) => {
    if (balance >= amount) {
      setBalance((prev) => prev - amount);
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        type: "debit",
        amount,
        description,
        date: new Date(),
      };
      setTransactions((prev) => [newTransaction, ...prev]);
      return true;
    }
    return false;
  };

  return (
    <WalletContext.Provider value={{ balance, transactions, addFunds, deductFunds }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
