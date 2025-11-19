import images from "@/constants/images";
import { useThemeStore } from "@/store/themeStore";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";

// Ahmadu Bello University coordinates
const ABU_LOCATION = {
  latitude: 11.157432,
  longitude: 7.652718,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Get API key from app.json
const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey || "";

export default function explore() {
  const { colors, isDarkMode } = useThemeStore();
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [showDirections, setShowDirections] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPermissionDeniedModal, setShowPermissionDeniedModal] =
    useState(false);
  const [showLocationRequiredModal, setShowLocationRequiredModal] =
    useState(false);
  const [showMarkerInfoModal, setShowMarkerInfoModal] = useState(false);
  const [showDirectionsErrorModal, setShowDirectionsErrorModal] =
    useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        // Location not enabled, show modal
        setShowLocationModal(true);
      } else {
        // Location enabled, get current position
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error("Error checking location permission:", error);
      setShowLocationModal(true);
    }
  };

  const requestLocationPermission = async () => {
    try {
      setShowLocationModal(false);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setShowPermissionDeniedModal(true);
      }
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  const handleGetDirections = async () => {
    if (!userLocation) {
      setShowLocationRequiredModal(true);
      return;
    }

    setLoading(true);
    setShowDirections(true);

    // Fit map to show both user location and destination
    setTimeout(() => {
      if (mapRef.current && userLocation) {
        mapRef.current.fitToCoordinates([userLocation, ABU_LOCATION], {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
      setLoading(false);
    }, 500);
  };

  const handleClearDirections = () => {
    setShowDirections(false);
    setDistance("");
    setDuration("");

    // Reset map to initial region
    if (mapRef.current) {
      mapRef.current.animateToRegion(ABU_LOCATION, 500);
    }
  };

  const handleMarkerPress = () => {
    setShowMarkerInfoModal(true);
  };

  const toggleMapType = () => {
    setMapType((prev) => (prev === "standard" ? "satellite" : "standard"));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View
        style={{
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        }}
        className="px-5 py-4"
      >
        <Text style={{ color: colors.text }} className="text-2xl font-bold">
          Explore
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm mt-1">
          Find vending machines near you
        </Text>
      </View>

      {/* Map Container */}
      <View style={{ flex: 1, position: "relative" }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={ABU_LOCATION}
          mapType={mapType}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          <Marker
            coordinate={{
              latitude: ABU_LOCATION.latitude,
              longitude: ABU_LOCATION.longitude,
            }}
            title="Solvend Vending Machine"
            description="Ahmadu Bello University, Zaria"
            onPress={handleMarkerPress}
          >
            <View className="rounded-xl">
              <Image
                source={images.solvend}
                style={{ width: 50, height: 50 }}
                resizeMode="contain"
                className="rounded-2xl"
              />
            </View>
          </Marker>

          {/* Directions Route */}
          {showDirections && userLocation && (
            <MapViewDirections
              origin={userLocation}
              destination={ABU_LOCATION}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={4}
              strokeColor={colors.primary}
              optimizeWaypoints={true}
              onReady={(result) => {
                setDistance(`${result.distance.toFixed(1)} km`);
                setDuration(`${Math.round(result.duration)} min`);
              }}
              onError={(errorMessage) => {
                console.error("Directions Error:", errorMessage);
                setShowDirectionsErrorModal(true);
                setShowDirections(false);
              }}
            />
          )}
        </MapView>

        {/* Map Controls */}
        <View
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            gap: 12,
          }}
        >
          {/* Map Type Toggle */}
          <TouchableOpacity
            onPress={toggleMapType}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              width: 48,
              height: 48,
              borderRadius: 12,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={mapType === "standard" ? "layers" : "map"}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Location Info Card */}
        <View
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <View className="flex-row items-center mb-2">
              <View
                style={{ backgroundColor: colors.primary + "15" }}
                className="w-10 h-10 rounded-xl justify-center items-center mr-3"
              >
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text
                  style={{ color: colors.text }}
                  className="text-base font-bold"
                >
                  Ahmadu Bello University
                </Text>
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-sm"
                >
                  Zaria, Kaduna State, Nigeria
                </Text>
              </View>
            </View>

            {/* Distance and Duration Info */}
            {showDirections && distance && duration && (
              <View className="flex-row items-center mb-2 mt-1">
                <View className="flex-row items-center flex-1">
                  <Ionicons name="car" size={16} color={colors.textSecondary} />
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="text-sm ml-1"
                  >
                    {distance}
                  </Text>
                </View>
                <View className="flex-row items-center flex-1">
                  <Ionicons
                    name="time"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="text-sm ml-1"
                  >
                    {duration}
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            {!showDirections ? (
              <TouchableOpacity
                onPress={handleGetDirections}
                style={{ backgroundColor: colors.primary }}
                className="rounded-xl py-3 flex-row justify-center items-center mt-2"
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={20} color="white" />
                    <Text className="text-white font-bold ml-2">
                      Get Directions
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleClearDirections}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.primary,
                  borderWidth: 2,
                }}
                className="rounded-xl py-3 flex-row justify-center items-center mt-2"
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  style={{ color: colors.primary }}
                  className="font-bold ml-2"
                >
                  Clear Directions
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Location Permission Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View
            style={{ backgroundColor: colors.card }}
            className="w-full rounded-3xl p-8"
          >
            {/* Icon */}
            <View className="items-center mb-4">
              <View
                className="w-20 h-20 rounded-full justify-center items-center mb-4"
                style={{ backgroundColor: colors.primary + "20" }}
              >
                <Ionicons name="location" size={48} color={colors.primary} />
              </View>
            </View>

            {/* Title */}
            <Text
              style={{ color: colors.text }}
              className="text-2xl font-bold text-center mb-3"
            >
              Location Required
            </Text>

            {/* Message */}
            <Text
              style={{ color: colors.textSecondary }}
              className="text-base text-center mb-8"
            >
              Please enable location services to view nearby vending machines
              and get directions.
            </Text>

            {/* Buttons */}
            <View className="gap-3">
              <TouchableOpacity
                onPress={requestLocationPermission}
                style={{ backgroundColor: colors.primary }}
                className="w-full rounded-2xl py-4"
              >
                <Text className="text-white text-center font-bold text-lg">
                  Enable Location
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowLocationModal(false)}
                style={{ backgroundColor: colors.border }}
                className="w-full rounded-2xl py-4"
              >
                <Text
                  style={{ color: colors.text }}
                  className="text-center font-bold text-base"
                >
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Permission Denied Modal */}
      <Modal
        visible={showPermissionDeniedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionDeniedModal(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View
            style={{ backgroundColor: colors.card }}
            className="w-full rounded-3xl p-8"
          >
            <View className="items-center mb-4">
              <View
                className="w-20 h-20 rounded-full justify-center items-center mb-4"
                style={{ backgroundColor: "#EF4444" + "20" }}
              >
                <Ionicons name="close-circle" size={48} color="#EF4444" />
              </View>
            </View>

            <Text
              style={{ color: colors.text }}
              className="text-2xl font-bold text-center mb-3"
            >
              Permission Denied
            </Text>

            <Text
              style={{ color: colors.textSecondary }}
              className="text-base text-center mb-8"
            >
              Location permission is required to show directions and get your
              current location.
            </Text>

            <TouchableOpacity
              onPress={() => setShowPermissionDeniedModal(false)}
              style={{ backgroundColor: colors.primary }}
              className="w-full rounded-2xl py-4"
            >
              <Text className="text-white text-center font-bold text-lg">
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Required for Directions Modal */}
      <Modal
        visible={showLocationRequiredModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationRequiredModal(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View
            style={{ backgroundColor: colors.card }}
            className="w-full rounded-3xl p-8"
          >
            <View className="items-center mb-4">
              <View
                className="w-20 h-20 rounded-full justify-center items-center mb-4"
                style={{ backgroundColor: colors.primary + "20" }}
              >
                <Ionicons name="navigate" size={48} color={colors.primary} />
              </View>
            </View>

            <Text
              style={{ color: colors.text }}
              className="text-2xl font-bold text-center mb-3"
            >
              Location Required
            </Text>

            <Text
              style={{ color: colors.textSecondary }}
              className="text-base text-center mb-8"
            >
              Please enable location services to get directions.
            </Text>

            <View className="gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowLocationRequiredModal(false);
                  requestLocationPermission();
                }}
                style={{ backgroundColor: colors.primary }}
                className="w-full rounded-2xl py-4"
              >
                <Text className="text-white text-center font-bold text-lg">
                  Enable
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowLocationRequiredModal(false)}
                style={{ backgroundColor: colors.border }}
                className="w-full rounded-2xl py-4"
              >
                <Text
                  style={{ color: colors.text }}
                  className="text-center font-bold text-base"
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Marker Info Modal */}
      <Modal
        visible={showMarkerInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMarkerInfoModal(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View
            style={{ backgroundColor: colors.card }}
            className="w-full rounded-3xl p-8"
          >
            <View className="items-center mb-4">
              <View
                className="w-20 h-20 rounded-full justify-center items-center mb-4"
                style={{ backgroundColor: colors.primary + "20" }}
              >
                <Ionicons name="location" size={48} color={colors.primary} />
              </View>
            </View>

            <Text
              style={{ color: colors.text }}
              className="text-2xl font-bold text-center mb-3"
            >
              Ahmadu Bello University
            </Text>

            <Text
              style={{ color: colors.textSecondary }}
              className="text-base text-center mb-8"
            >
              Zaria, Kaduna State, Nigeria
            </Text>

            <View className="gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowMarkerInfoModal(false);
                  handleGetDirections();
                }}
                style={{ backgroundColor: colors.primary }}
                className="w-full rounded-2xl py-4"
              >
                <Text className="text-white text-center font-bold text-lg">
                  Get Directions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowMarkerInfoModal(false)}
                style={{ backgroundColor: colors.border }}
                className="w-full rounded-2xl py-4"
              >
                <Text
                  style={{ color: colors.text }}
                  className="text-center font-bold text-base"
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Directions Error Modal */}
      <Modal
        visible={showDirectionsErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDirectionsErrorModal(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View
            style={{ backgroundColor: colors.card }}
            className="w-full rounded-3xl p-8"
          >
            <View className="items-center mb-4">
              <View
                className="w-20 h-20 rounded-full justify-center items-center mb-4"
                style={{ backgroundColor: "#EF4444" + "20" }}
              >
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
              </View>
            </View>

            <Text
              style={{ color: colors.text }}
              className="text-2xl font-bold text-center mb-3"
            >
              Error
            </Text>

            <Text
              style={{ color: colors.textSecondary }}
              className="text-base text-center mb-8"
            >
              Unable to fetch directions. Please check your API key.
            </Text>

            <TouchableOpacity
              onPress={() => setShowDirectionsErrorModal(false)}
              style={{ backgroundColor: colors.primary }}
              className="w-full rounded-2xl py-4"
            >
              <Text className="text-white text-center font-bold text-lg">
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
