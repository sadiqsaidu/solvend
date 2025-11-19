import React, { useEffect, useState } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  ImageStyle,
  PanResponder,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

interface SliderButtonProps {
  onSlideComplete: () => void;
  title: string;
  icon?: ImageSourcePropType;
  containerStyle?: ViewStyle;
  sliderStyle?: ViewStyle;
  textStyle?: TextStyle;
  iconStyle?: ImageStyle;
  sliderColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

const SliderButton: React.FC<SliderButtonProps> = ({
  onSlideComplete,
  title,
  icon,
  containerStyle,
  sliderStyle,
  textStyle,
  iconStyle,
  sliderColor = "#00BFA5",
  backgroundColor = "#000",
  textColor = "#FFFFFF",
}) => {
  const [sliderPosition] = useState(new Animated.Value(0));
  const [sliderWidth, setSliderWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Calculate threshold for completion (80% of container width)
  const threshold = containerWidth * 0.8;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      // Limit the slider movement between 0 and container width - slider width
      const newPosition = Math.max(
        0,
        Math.min(gestureState.dx, containerWidth - sliderWidth)
      );
      sliderPosition.setValue(newPosition);
    },
    onPanResponderRelease: (_, gestureState) => {
      // Check if the slider has been dragged past the threshold
      if (gestureState.dx > threshold) {
        // Complete the slide
        Animated.timing(sliderPosition, {
          toValue: containerWidth - sliderWidth,
          duration: 100,
          useNativeDriver: false,
        }).start(() => {
          setIsCompleted(true);
          onSlideComplete();
        });
      } else {
        // Reset the slider
        Animated.timing(sliderPosition, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  // Reset when completed
  useEffect(() => {
    if (isCompleted) {
      const timeout = setTimeout(() => {
        setIsCompleted(false);
        Animated.timing(sliderPosition, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [isCompleted, sliderPosition]);

  return (
    <View
      style={[styles.container, { backgroundColor }, containerStyle]}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.slidePath,
          {
            backgroundColor: "#000",
            width: sliderPosition.interpolate({
              inputRange: [0, containerWidth - sliderWidth],
              outputRange: ["0%", "100%"],
            }),
            // opacity: 0.3,
          },
        ]}
      />

      <Text style={[styles.text, textStyle]}>
        {"           "}
        {title}
      </Text>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.slider,
          {
            backgroundColor: sliderColor,
            transform: [{ translateX: sliderPosition }],
          },
          sliderStyle,
        ]}
        onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
      >
        {icon && <Image source={icon} style={[styles.icon, iconStyle]} />}
        {/* <Text style={styles.arrowText}>›</Text> */}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#334155",
  },
  slidePath: {
    position: "absolute",
    left: 0,
    height: "100%",
    borderRadius: 30,
    zIndex: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    color: "#949494",
    // zIndex: 1,
  },
  slider: {
    position: "absolute",
    left: 0,
    height: "100%",
    aspectRatio: 1,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 99,
  },
  icon: {
    width: 24,
    height: 24,
    // tintColor: "white",
  },
  arrowText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
});

export default SliderButton;
