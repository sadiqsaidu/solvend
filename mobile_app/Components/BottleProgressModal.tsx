import { useAchievementStore } from "@/store/achievementStore";
import { useThemeStore } from "@/store/themeStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Animated, ScrollView, Text, View } from "react-native";

interface BottleProgressModalProps {
  visible: boolean;
  progress: number;
  onClose: () => void;
}

export const BottleProgressModal: React.FC<BottleProgressModalProps> = ({
  visible,
  progress,
  onClose,
}) => {
  const { colors } = useThemeStore();
  const { completedBottles } = useAchievementStore();
  const fillAnimation = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.timing(fillAnimation, {
        toValue: progress,
        duration: 1500,
        useNativeDriver: false,
      }).start(() => {
        setTimeout(onClose, 2000);
      });
    } else {
      fillAnimation.setValue(0);
    }
  }, [visible, progress]);

  if (!visible) return null;

  return (
    // <Modal transparent visible={visible} animationType="fade">
    <View className="flex-1 justify-center items-center">
      <View className="w-32 h-64 relative">
        {/* Bottle Outline */}
        <View
          className="w-full h-full rounded-3xl absolute"
          style={{
            borderWidth: 3,
            borderColor: colors.primary,
            backgroundColor: colors.card,
          }}
        />

        {/* Bottle Fill */}
        <Animated.View
          className="w-full absolute bottom-0 rounded-3xl"
          style={{
            height: fillAnimation.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
            backgroundColor: colors.primary + "50",
          }}
        />

        {/* Progress Text */}
        <View className="absolute top-2 left-0 right-0 items-center">
          <Text style={{ color: colors.text }} className="text-lg font-bold">
            {progress}%
          </Text>
        </View>

        {/* Achievement Icon */}
        <View className="absolute -top-4 -right-4">
          <View
            className="w-8 h-8 rounded-full justify-center items-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="trophy" size={20} color="white" />
          </View>
        </View>
      </View>

      {/* Completed Bottles Icons */}
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
    // </Modal>
  );
};
