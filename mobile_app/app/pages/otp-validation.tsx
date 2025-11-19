import { useThemeStore } from "@/store/themeStore";
import { SolvendAPI } from "@/utils/solvend API";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OTPValidationScreen() {
  const [otp, setOtp] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { colors, isDarkMode } = useThemeStore();

  const handleValidateOTP = async () => {
    if (otp.length !== 4) {
      Alert.alert("Invalid OTP", "Please enter a 4-digit OTP");
      return;
    }

    setIsValidating(true);

    try {
      console.log("Validating OTP:", otp);
      const result = await SolvendAPI.Purchase.validateOtp({ otp });

      if (result.success) {
        console.log("OTP validated successfully! Transaction:", result.tx);

        Alert.alert(
          "Success! 🎉",
          "Your purchase has been verified!\n\nYou can now collect your drink from the vending machine.",
          [
            {
              text: "OK",
              onPress: () => router.push("/(tabs)"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Validation Failed",
          result.error || "Invalid OTP. Please try again."
        );
      }
    } catch (error: any) {
      console.error("OTP validation error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to validate OTP. Please try again."
      );
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View
        className="flex-row items-center px-5 py-4 border-b"
        style={{ borderBottomColor: colors.border }}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text }} className="text-xl font-bold">
          Enter OTP
        </Text>
      </View>

      <View className="flex-1 px-6 pt-12">
        {/* Icon */}
        <View className="items-center mb-8">
          <View
            className="w-24 h-24 rounded-full justify-center items-center mb-6"
            style={{ backgroundColor: colors.primary + "20" }}
          >
            <Ionicons name="keypad" size={48} color={colors.primary} />
          </View>
          <Text
            style={{ color: colors.text }}
            className="text-2xl font-bold text-center mb-3"
          >
            Verify Your Purchase
          </Text>
          <Text
            style={{ color: colors.textSecondary }}
            className="text-base text-center px-8"
          >
            Enter the 4-digit OTP you received to collect your drink from the
            vending machine
          </Text>
        </View>

        {/* OTP Input */}
        <View className="mb-8">
          <TextInput
            style={{
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            }}
            className="rounded-2xl p-6 text-center text-4xl tracking-widest border-2"
            maxLength={4}
            keyboardType="numeric"
            value={otp}
            onChangeText={setOtp}
            placeholder="••••"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
        </View>

        {/* Validate Button */}
        <TouchableOpacity
          onPress={handleValidateOTP}
          disabled={otp.length !== 4 || isValidating}
          className="mb-4"
        >
          {otp.length === 4 && !isValidating ? (
            <View
              style={{ backgroundColor: colors.primary }}
              className="w-full rounded-2xl py-5 flex-row justify-center items-center"
            >
              <Ionicons
                name="checkmark-circle"
                size={22}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="text-white text-center font-bold text-lg">
                Validate OTP
              </Text>
            </View>
          ) : (
            <View
              style={{ backgroundColor: colors.border }}
              className="w-full rounded-2xl py-5"
            >
              {isValidating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-center font-semibold text-lg"
                >
                  Validate OTP
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Info Card */}
        <View
          className="rounded-2xl p-4 mt-4"
          style={{ backgroundColor: colors.card }}
        >
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.primary}
              style={{ marginRight: 12, marginTop: 2 }}
            />
            <View className="flex-1">
              <Text
                style={{ color: colors.text }}
                className="font-semibold mb-1"
              >
                How it works
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-sm leading-5"
              >
                After your payment is confirmed, the backend generates a 4-digit
                OTP. Check your notifications or backend logs for the OTP, then
                enter it here to redeem your purchase.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
