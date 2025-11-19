import { useAchievementStore } from "@/store/achievementStore";
import { useThemeStore } from "@/store/themeStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AchievementsScreen() {
  const { colors, isDarkMode } = useThemeStore();
  const { purchaseProgress, completedBottles } = useAchievementStore();

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
      <View className="px-4 py-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-2xl justify-center items-center mr-3"
          style={{ backgroundColor: colors.card }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text }} className="text-2xl font-bold">
          Achievements
        </Text>
      </View>

      {/* Current Progress */}
      <View className="px-4 mt-4">
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          }}
          className="rounded-3xl p-6"
        >
          <Text
            style={{ color: colors.textSecondary }}
            className="text-sm mb-4"
          >
            Current Progress
          </Text>

          <View className="items-center">
            {/* Bottle with Progress */}
            <View className="w-32 h-64 relative mb-6">
              {/* Bottle Outline */}
              <View
                className="w-full h-full rounded-3xl absolute"
                style={{
                  borderWidth: 3,
                  borderColor: colors.primary,
                  backgroundColor: colors.background,
                }}
              />

              {/* Bottle Fill */}
              <View
                className="w-full absolute bottom-0 rounded-3xl"
                style={{
                  height: `${purchaseProgress}%`,
                  backgroundColor: colors.primary + "50",
                }}
              />

              {/* Progress Text */}
              <View className="absolute top-2 left-0 right-0 items-center">
                <Text
                  style={{ color: colors.text }}
                  className="text-lg font-bold"
                >
                  {purchaseProgress}%
                </Text>
              </View>
            </View>

            <Text style={{ color: colors.text }} className="text-base">
              {10 - purchaseProgress / 10} more purchases until next reward
            </Text>
          </View>
        </View>
      </View>

      {/* Completed Bottles */}
      <View className="px-4 mt-4">
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          }}
          className="rounded-3xl p-6"
        >
          <Text
            style={{ color: colors.textSecondary }}
            className="text-sm mb-4"
          >
            Completed Bottles
          </Text>

          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View
                className="w-16 h-16 rounded-2xl justify-center items-center mr-4"
                style={{ backgroundColor: colors.primary + "15" }}
              >
                <Ionicons name="trophy" size={32} color={colors.primary} />
              </View>
              <View>
                <Text
                  style={{ color: colors.text }}
                  className="text-2xl font-bold"
                >
                  {completedBottles}
                </Text>
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-sm"
                >
                  NFT Completed
                </Text>
              </View>
            </View>

            {/* Small Bottle Icon */}
            {completedBottles > 0 && (
              <View className="w-12 h-20 relative">
                <View
                  className="w-full h-full rounded-xl absolute"
                  style={{
                    borderWidth: 2,
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + "50",
                  }}
                />
              </View>
            )}

            {completedBottles > 0 && (
              <View className="mt-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row justify-center">
                    {[...Array(completedBottles)].map((_, index) => (
                      <View
                        key={index}
                        className="w-8 h-8 rounded-full justify-center items-center mr-2"
                        style={{
                          backgroundColor: colors.primary,
                          elevation: 3,
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 3,
                        }}
                      >
                        <Ionicons name="trophy" size={16} color="white" />
                      </View>
                    ))}
                  </View>
                </ScrollView>
                <Text
                  style={{ color: colors.text }}
                  className="text-center mt-2 text-sm font-medium"
                >
                  {completedBottles} Bottle{completedBottles !== 1 ? "s" : ""}{" "}
                  Completed
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
