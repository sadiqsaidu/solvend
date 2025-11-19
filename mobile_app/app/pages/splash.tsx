import { useWalletStore } from "@/store/walletStore";
import { Ionicons } from "@expo/vector-icons";
import { usePrivy } from "@privy-io/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");
const SPLASH_SEEN_KEY = "@solvend_splash_seen";

const splashScreens = [
  {
    icon: "rocket-outline",
    title: "SolVend",
    subtitle: "Web3 Powered Vending",
    description: "Experience the future of vending with blockchain technology.",
    gradient: ["#667eea", "#764ba2"],
  },
  {
    icon: "flash-outline",
    title: "SolVend",
    subtitle: "Instant Transactions",
    description: "Lightning-fast purchases powered by Solana blockchain.",
    gradient: ["#f093fb", "#f5576c"],
  },
  {
    icon: "shield-checkmark-outline",
    title: "SolVend",
    subtitle: "Secure & Decentralized",
    description: "Your transactions are protected by blockchain technology.",
    gradient: ["#4facfe", "#00f2fe"],
  },
];

export default function SplashScreen() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const fadeAnim = useState(new Animated.Value(1))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

  const { user, isReady } = usePrivy();
  const { isAuthenticated: storedAuthState } = useWalletStore();

  // Check if user has seen splash before
  useEffect(() => {
    const checkSplashStatus = async () => {
      try {
        const hasSeenSplash = await AsyncStorage.getItem(SPLASH_SEEN_KEY);

        if (hasSeenSplash === "true") {
          // User has seen splash before, skip to appropriate screen
          // Check stored auth state first (faster than waiting for Privy)
          if (user || storedAuthState) {
            router.replace("/(tabs)"); // Authenticated user -> home screen
          } else {
            router.replace("/pages/LoginScreen"); // Not authenticated -> login screen
          }
        } else {
          // First time user, show splash
          setShowSplash(true);
        }
      } catch (error) {
        console.error("Error checking splash status:", error);
        // On error, show splash to be safe
        setShowSplash(true);
      } finally {
        setIsChecking(false);
      }
    };

    // Wait for Privy to be ready before checking (or use stored state)
    if (isReady || storedAuthState) {
      checkSplashStatus();
    }
  }, [isReady, user, storedAuthState]);

  // Animate splash screens
  useEffect(() => {
    if (!showSplash) return;

    const timer = setInterval(() => {
      // Fade and scale animation
      Animated.parallel([
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      setCurrentScreen((prev) => (prev + 1) % splashScreens.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [showSplash]);

  const handleGetStarted = async () => {
    try {
      // Mark splash as seen
      await AsyncStorage.setItem(SPLASH_SEEN_KEY, "true");

      // Navigate to appropriate screen based on auth status
      if (user || storedAuthState) {
        router.replace("/(tabs)"); // Authenticated user -> home screen
      } else {
        router.replace("/pages/LoginScreen"); // Not authenticated -> login screen
      }
    } catch (error) {
      console.error("Error saving splash status:", error);
      // Navigate anyway even if storage fails
      if (user || storedAuthState) {
        router.replace("/(tabs)");
      } else {
        router.replace("/pages/LoginScreen");
      }
    }
  };

  const handleSkip = async () => {
    try {
      // Mark splash as seen
      await AsyncStorage.setItem(SPLASH_SEEN_KEY, "true");

      // Navigate to appropriate screen
      if (user || storedAuthState) {
        router.replace("/(tabs)");
      } else {
        router.replace("/pages/LoginScreen");
      }
    } catch (error) {
      console.error("Error saving splash status:", error);
      if (user || storedAuthState) {
        router.replace("/(tabs)");
      } else {
        router.replace("/pages/LoginScreen");
      }
    }
  };

  const currentData = splashScreens[currentScreen];

  // Show loading while checking splash status (skip if we have stored auth)
  if ((isChecking && !storedAuthState) || (!isReady && !storedAuthState)) {
    return (
      <View style={{ flex: 1, backgroundColor: "#667eea" }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white mt-4 text-lg">Loading...</Text>
        </View>
      </View>
    );
  }

  // Don't render splash if user has already seen it
  if (!showSplash) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: currentData.gradient[0] }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View className="flex-1 justify-center items-center px-8">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
          className="flex-1 justify-center items-center"
        >
          {/* Logo/Icon with glow effect */}
          <View className="mb-10">
            <View className="bg-white/20 p-10 rounded-full backdrop-blur-xl shadow-2xl">
              <Ionicons
                name={currentData.icon as any}
                size={120}
                color="white"
              />
            </View>
          </View>

          {/* Title */}
          <Text className="text-white text-6xl font-bold mb-4 tracking-wider text-center">
            {currentData.title}
          </Text>

          {/* Subtitle with gradient underline effect */}
          <View className="items-center mb-8">
            <Text className="text-white/90 text-2xl text-center font-semibold mb-2">
              {currentData.subtitle}
            </Text>
            <View className="w-24 h-1 bg-white/40 rounded-full" />
          </View>

          {/* Description */}
          <Text className="text-white/80 text-lg text-center px-4 leading-7 max-w-sm">
            {currentData.description}
          </Text>
        </Animated.View>

        {/* Bottom Section */}
        <View className="mb-12 w-full">
          {/* Pagination Dots */}
          <View className="flex-row justify-center mb-10">
            {splashScreens.map((_, index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: index === currentScreen ? 1 : 0.4,
                }}
                className={`h-2.5 rounded-full mx-1.5 transition-all duration-300 ${
                  index === currentScreen
                    ? "bg-white w-10"
                    : "bg-white/60 w-2.5"
                }`}
              />
            ))}
          </View>

          {/* Get Started Button */}
          <TouchableOpacity
            onPress={handleGetStarted}
            className="mb-4"
            activeOpacity={0.85}
          >
            <View className="bg-white rounded-2xl mx-4 overflow-hidden">
              <View className="px-8 py-5">
                <View className="flex-row items-center justify-center">
                  <Text
                    className="text-xl font-bold text-center tracking-wide mr-2"
                    style={{ color: currentData.gradient[0] }}
                  >
                    GET STARTED
                  </Text>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={24}
                    color={currentData.gradient[0]}
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Skip Button */}
          {/* <TouchableOpacity
            onPress={handleSkip}
            className="py-3"
            activeOpacity={0.7}
          >
            <Text className="text-white/80 text-center text-base font-medium">
              Skip Introduction
            </Text>
          </TouchableOpacity> */}
        </View>
      </View>
    </View>
  );
}
