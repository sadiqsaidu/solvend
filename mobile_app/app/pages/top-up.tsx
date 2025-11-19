import { useThemeStore } from "@/store/themeStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useWalletStore } from "@/store/walletStore";
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const PRESET_AMOUNTS = [
  { value: 1, label: "₦500" },
  { value: 2, label: "₦1000" },
  { value: 5, label: "₦2000" },
  { value: 10, label: "₦3000" },
  { value: 15, label: "₦5000" },
  { value: 20, label: "₦10000" },
];

export default function TopUpScreen() {
  const [amount, setAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const { addBalance, balance } = useWalletStore();
  const { colors, isDarkMode } = useThemeStore();
  const { addTransaction } = useTransactionStore();
  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleAmountSelect = (value: number) => {
    setAmount(value);
  };

  const handleTopUp = () => {
    if (amount > 0) {
      addBalance(amount);
      addTransaction({
        type: "credit",
        category: "topup",
        amount,
        status: "completed",
        description: "Wallet Top-up",
      });
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={{ backgroundColor: colors.primary }} className="px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full justify-center items-center mr-3"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-bold">Top Up Wallet</Text>
            <Text className="text-white text-xs mt-1" style={{ opacity: 0.7 }}>
              Add funds to your wallet
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        className="flex-1"
      >
        {/* Current Balance Card */}
        <View className="mx-4 mt-4">
          <View
            style={{ backgroundColor: colors.card }}
            className="rounded-2xl p-5 shadow-sm"
          >
            <View className="flex-row justify-between items-center">
              <View>
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-sm mb-1"
                >
                  Current Balance
                </Text>
                <Text
                  style={{ color: colors.text }}
                  className="text-3xl font-bold"
                >
                  ₦{balance.toFixed(2)}
                </Text>
              </View>
              <View
                style={{ backgroundColor: colors.primary + "20" }}
                className="w-14 h-14 rounded-full justify-center items-center"
              >
                <Ionicons name="wallet" size={28} color={colors.primary} />
              </View>
            </View>
          </View>
        </View>

        {/* Top Up Amount Section */}
        <View className="mx-4 mt-6">
          <View
            style={{ backgroundColor: colors.card }}
            className="rounded-3xl p-6 shadow-sm"
          >
            <View className="flex-row items-center mb-6">
              <View
                style={{ backgroundColor: colors.primary }}
                className="w-10 h-10 rounded-full justify-center items-center"
              >
                <Ionicons name="cash" size={22} color="white" />
              </View>
              <View className="ml-3">
                <Text
                  style={{ color: colors.text }}
                  className="text-lg font-bold"
                >
                  Select Amount
                </Text>
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-xs"
                >
                  Choose or enter amount to add
                </Text>
              </View>
            </View>

            {/* Amount Display */}
            <View
              style={{ backgroundColor: colors.background }}
              className="rounded-2xl p-5 mb-6"
            >
              <Text
                style={{ color: colors.textSecondary }}
                className="text-sm mb-2"
              >
                Amount to add
              </Text>
              <View className="flex-row items-baseline">
                <Text
                  style={{ color: colors.primary }}
                  className="text-2xl font-bold mr-2"
                >
                  ₦
                </Text>
                <Text
                  style={{ color: colors.text }}
                  className="text-4xl font-bold"
                >
                  {amount.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Preset Amount Grid */}
            <View className="flex-row flex-wrap justify-between mb-2">
              {PRESET_AMOUNTS.map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  onPress={() => handleAmountSelect(preset.value)}
                  className="w-[31%] mb-3"
                >
                  {amount === preset.value ? (
                    <View
                      style={{ backgroundColor: colors.primary }}
                      className="rounded-2xl py-4"
                    >
                      <Text className="text-white text-center font-bold text-base">
                        {preset.label}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={{ backgroundColor: colors.border }}
                      className="rounded-2xl py-4"
                    >
                      <Text
                        style={{ color: colors.text }}
                        className="text-center font-semibold"
                      >
                        {preset.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View className="mx-4 mt-6 mb-8">
          <Text
            style={{ color: colors.text }}
            className="text-lg font-bold mb-4"
          >
            Payment Method
          </Text>

          <TouchableOpacity
            style={{ backgroundColor: colors.card }}
            className="rounded-2xl p-4 mb-3 flex-row items-center"
          >
            <View
              style={{ backgroundColor: colors.primary }}
              className="w-12 h-12 rounded-full justify-center items-center"
            >
              <Ionicons name="card" size={24} color="white" />
            </View>
            <View className="flex-1 ml-4">
              <Text style={{ color: colors.text }} className="font-bold">
                Debit/Credit Card
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-xs mt-1"
              >
                Pay with your card
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={{ backgroundColor: colors.card }}
            className="rounded-2xl p-4 mb-3 flex-row items-center"
          >
            <View
              style={{ backgroundColor: colors.accent + "20" }}
              className="w-12 h-12 rounded-full justify-center items-center"
            >
              <Ionicons name="wallet" size={24} color={colors.accent} />
            </View>
            <View className="flex-1 ml-4">
              <Text style={{ color: colors.text }} className="font-bold">
                Bank Transfer
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-xs mt-1"
              >
                Transfer from your bank
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity> */}

          {/* Top Up Button */}
          <Animated.View style={animatedButtonStyle} className="mt-4">
            <TouchableOpacity
              onPress={handleTopUp}
              disabled={amount === 0 || isProcessing}
            >
              {amount > 0 && !isProcessing ? (
                <View
                  style={{ backgroundColor: colors.primary }}
                  className="rounded-2xl py-5"
                >
                  <View className="flex-row justify-center items-center">
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text className="text-white text-center font-bold text-lg ml-2">
                      Proceed to Payment
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={{ backgroundColor: colors.border }}
                  className="rounded-2xl py-5"
                >
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="text-center font-semibold text-lg"
                  >
                    {isProcessing ? "Processing..." : "Select Amount"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
