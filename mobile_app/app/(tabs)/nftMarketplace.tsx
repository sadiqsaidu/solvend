import images from "@/constants/images";
import { useThemeStore } from "@/store/themeStore";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from "react-native";

export default function nftMarketplace() {
  const { colors, isDarkMode } = useThemeStore();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Fade in text
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Continuous rotation animation for decorative elements
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Decorative rotating circles */}
      <Animated.View
        style={{
          position: "absolute",
          top: 50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: colors.primary + "10",
          transform: [{ rotate: spin }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          bottom: -80,
          left: -80,
          width: 250,
          height: 250,
          borderRadius: 125,
          backgroundColor: colors.primary + "08",
          transform: [{ rotate: spin }],
        }}
      />

      <View className="flex-1 justify-center items-center px-6">
        {/* Animated Solvend Logo */}
        <Animated.View
          style={{
            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
          }}
          className="mb-8"
        >
          <View
            style={{
              backgroundColor: "#f7f4f4",
              borderColor: colors.border,
              borderWidth: 2,
              padding: 30,
              borderRadius: 40,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <Image
              source={images.solvend}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Animated Text */}
        <Animated.View style={{ opacity: fadeAnim }} className="items-center">
          <Text
            style={{ color: colors.text }}
            className="text-3xl font-bold mb-8 mt-4 text-center"
          >
            NFT Marketplace
          </Text>

          <View className="flex-row items-center mb-8">
            <View
              style={{ backgroundColor: colors.primary + "20" }}
              className="px-4 py-2 rounded-full"
            >
              <Text
                style={{ color: colors.primary }}
                className="text-base font-bold"
              >
                Coming Soon
              </Text>
            </View>
          </View>

          <Text
            style={{ color: colors.textSecondary }}
            className="text-base text-center mb-8 leading-6"
          >
            Gift, Buy or Trade the NFTs you earn!{"\n"}
            From purchasing drink.
          </Text>

          {/* Feature badges */}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
