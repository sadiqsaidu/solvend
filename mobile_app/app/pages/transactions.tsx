import { useThemeStore } from "@/store/themeStore";
import { Transaction, useTransactionStore } from "@/store/transactionStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TransactionsScreen() {
  const { colors, isDarkMode } = useThemeStore();
  const { transactions, getTotalSpent, getTotalEarned } = useTransactionStore();
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");

  // Filter transactions based on selected filter
  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.type === filter;
  });

  // Sort transactions by timestamp (newest first)
  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  const renderTransactionItem = (transaction: Transaction) => {
    const isCredit = transaction.type === "credit";

    // Convert timestamp to Date object
    const transactionDate = new Date(transaction.timestamp);
    const formattedDate = transactionDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = transactionDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Get status color
    const getStatusColor = () => {
      switch (transaction.status) {
        case "completed":
          return "#10B981";
        case "pending":
          return "#F59E0B";
        case "failed":
          return "#EF4444";
        default:
          return colors.textSecondary;
      }
    };

    // Get category icon
    const getCategoryIcon = () => {
      switch (transaction.category) {
        case "purchase":
          return "cart";
        case "topup":
          return "add-circle";
        case "reward":
          return "gift";
        case "transfer":
          return "swap-horizontal";
        default:
          return "cash";
      }
    };

    return (
      <TouchableOpacity
        key={transaction.id}
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        }}
        className="rounded-2xl p-4 mb-3"
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <View
              className="w-12 h-12 rounded-2xl justify-center items-center mr-3"
              style={{
                backgroundColor: isCredit
                  ? "#10B981" + "15"
                  : colors.primary + "15",
              }}
            >
              <Ionicons
                name={getCategoryIcon()}
                size={24}
                color={isCredit ? "#10B981" : colors.primary}
              />
            </View>
            <View className="flex-1">
              <Text
                style={{ color: colors.text }}
                className="text-base font-semibold mb-1"
              >
                {transaction.description}
              </Text>
              <View className="flex-row items-center">
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-[8px] mr-2"
                >
                  {formattedDate} • {formattedTime}
                </Text>
                <View
                  className="px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: getStatusColor() + "20" }}
                >
                  <Text
                    style={{ color: getStatusColor() }}
                    className="text-[9px] font-medium capitalize"
                  >
                    {transaction.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View className="items-end ml-2">
            <Text
              style={{
                color: isCredit ? "#10B981" : "#EF4444",
              }}
              className="text-sm font-bold"
            >
              {isCredit ? "+" : "-"} {transaction.amount.toFixed(2)} USDC
            </Text>
            {transaction.txHash && (
              <Text
                style={{ color: colors.textSecondary }}
                className="text-xs mt-1"
              >
                {transaction.txHash.slice(0, 6)}...
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={{ backgroundColor: colors.background }}
      className="flex-1"
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View className="px-4 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl justify-center items-center mr-3"
            style={{ backgroundColor: colors.card }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={{ color: colors.text }} className="text-2xl font-bold">
              All Transactions
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="text-sm mt-1"
            >
              {sortedTransactions.length} transaction
              {sortedTransactions.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* Summary Cards */}
      <View className="px-4 mb-4">
        <View className="flex-row gap-3">
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
            }}
            className="flex-1 rounded-2xl p-4"
          >
            <View className="flex-row items-center mb-2">
              <View
                className="w-8 h-8 rounded-full justify-center items-center mr-2"
                style={{ backgroundColor: "#10B981" + "20" }}
              >
                <Ionicons name="arrow-down" size={16} color="#10B981" />
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-xs">
                Earned
              </Text>
            </View>
            <Text style={{ color: "#10B981" }} className="text-xl font-bold">
              {getTotalEarned().toFixed(2)} USDC
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
            }}
            className="flex-1 rounded-2xl p-4"
          >
            <View className="flex-row items-center mb-2">
              <View
                className="w-8 h-8 rounded-full justify-center items-center mr-2"
                style={{ backgroundColor: "#EF4444" + "20" }}
              >
                <Ionicons name="arrow-up" size={16} color="#EF4444" />
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-xs">
                Spent
              </Text>
            </View>
            <Text style={{ color: "#EF4444" }} className="text-xl font-bold">
              {getTotalSpent().toFixed(2)} USDC
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="px-4 mb-4">
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          }}
          className="flex-row rounded-2xl p-1"
        >
          <TouchableOpacity
            onPress={() => setFilter("all")}
            style={{
              backgroundColor:
                filter === "all" ? colors.primary : "transparent",
            }}
            className="flex-1 py-3 rounded-xl"
          >
            <Text
              style={{
                color: filter === "all" ? "white" : colors.textSecondary,
              }}
              className="text-center font-semibold"
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter("credit")}
            style={{
              backgroundColor:
                filter === "credit" ? colors.primary : "transparent",
            }}
            className="flex-1 py-3 rounded-xl"
          >
            <Text
              style={{
                color: filter === "credit" ? "white" : colors.textSecondary,
              }}
              className="text-center font-semibold"
            >
              Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter("debit")}
            style={{
              backgroundColor:
                filter === "debit" ? colors.primary : "transparent",
            }}
            className="flex-1 py-3 rounded-xl"
          >
            <Text
              style={{
                color: filter === "debit" ? "white" : colors.textSecondary,
              }}
              className="text-center font-semibold"
            >
              Expenses
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {sortedTransactions.length > 0 ? (
          sortedTransactions.map(renderTransactionItem)
        ) : (
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
            }}
            className="rounded-2xl p-12 mt-8"
          >
            <View className="items-center">
              <View
                style={{ backgroundColor: colors.border }}
                className="w-20 h-20 rounded-full justify-center items-center mb-4"
              >
                <Ionicons
                  name="receipt-outline"
                  size={40}
                  color={colors.textSecondary}
                />
              </View>
              <Text
                style={{ color: colors.text }}
                className="text-lg font-bold mb-2"
              >
                No Transactions
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-sm text-center"
              >
                {filter === "all"
                  ? "You haven't made any transactions yet"
                  : `No ${filter === "credit" ? "income" : "expense"} transactions found`}
              </Text>
            </View>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
