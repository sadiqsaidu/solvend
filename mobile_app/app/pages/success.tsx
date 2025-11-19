import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { StatusBar, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from "react-native-reanimated";
// import * as Clipboard from "expo-clipboard";

interface SuccessScreenProps {
  otp: string;
}

export default function SuccessScreen() {
  const otp = "4599"; // This would normally come from the purchase process
  const { colors, isDark } = useTheme();

  // Animation values
  const checkScale = useSharedValue(0);
  const cardScale = useSharedValue(0.8);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    // Animate check icon
    checkScale.value = withSpring(1, { damping: 8, stiffness: 100 });

    // Animate card
    cardScale.value = withSpring(1, { damping: 10, stiffness: 80 });

    // Shimmer effect
    shimmer.value = withRepeat(
      withSequence(
        withSpring(1, { duration: 1000 }),
        withSpring(0, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.3,
  }));

  // const copyToClipboard = async () => {
  //   await Clipboard.setStringAsync(otp);
  // };

  return (
    <View style={{ backgroundColor: colors.primary }} className="flex-1">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <View className="flex-1 px-4 justify-center items-center">
        {/* Success Icon */}
        <Animated.View style={checkAnimatedStyle} className="mb-8">
          <View
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            className="w-24 h-24 rounded-full justify-center items-center"
          >
            <View className="w-20 h-20 bg-white rounded-full justify-center items-center">
              <Ionicons
                name="checkmark-circle"
                size={80}
                color={colors.accent}
              />
            </View>
          </View>
        </Animated.View>

        {/* Main Card */}
        <Animated.View style={cardAnimatedStyle} className="w-full">
          <View
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            className="rounded-3xl p-8 items-center"
          >
            <Text className="text-white text-3xl font-bold mb-2">
              Payment Successful!
            </Text>
            <Text
              className="text-white text-center mb-2"
              style={{ opacity: 0.8 }}
            >
              Your transaction has been completed
            </Text>

            <Animated.View style={shimmerAnimatedStyle}>
              <View
                className="w-16 h-1 rounded-full mb-6"
                style={{ backgroundColor: "rgba(255,255,255,0.5)" }}
              />
            </Animated.View>

            {/* OTP Section */}
            <View
              className="w-full rounded-2xl p-6 mb-6"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <Text
                className="text-white text-center font-semibold mb-4"
                style={{ opacity: 0.9 }}
              >
                Your One-Time Password
              </Text>

              <View className="flex-row justify-center mb-4">
                {otp.split("").map((digit, index) => (
                  <View
                    key={index}
                    className="w-14 h-16 bg-white rounded-xl justify-center items-center mx-1 shadow-lg"
                  >
                    <Text
                      className="text-3xl font-bold"
                      style={{ color: colors.primary }}
                    >
                      {digit}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                className="flex-row justify-center items-center rounded-xl py-3"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                // onPress={copyToClipboard}
              >
                <Ionicons name="copy-outline" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Copy Code</Text>
              </TouchableOpacity>

              <Text
                className="text-white text-center text-sm mt-4"
                style={{ opacity: 0.7 }}
              >
                Enter this code on the vending machine to collect your drink
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="w-full gap-3">
              <TouchableOpacity
                className="w-full rounded-2xl py-4 flex-row justify-center items-center"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                onPress={() => router.push("/(tabs)")}
              >
                <Ionicons name="image-outline" size={20} color="white" />
                <Text className="text-white text-center font-bold ml-2">
                  Save as Image
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white w-full rounded-2xl py-4 flex-row justify-center items-center"
                onPress={() => router.push("/(tabs)")}
              >
                <Ionicons name="refresh" size={20} color={colors.primary} />
                <Text
                  className="text-center font-bold ml-2"
                  style={{ color: colors.primary }}
                >
                  close
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-2"
                onPress={() => router.push("/(tabs)")}
              >
                <Text className="text-white text-center font-semibold">
                  Back to Home
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Decorative Elements */}
        <View
          className="absolute top-20 left-10 w-20 h-20 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        />
        <View
          className="absolute bottom-32 right-8 w-32 h-32 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        />
        <View
          className="absolute top-40 right-16 w-16 h-16 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        />
      </View>
    </View>
  );
}
