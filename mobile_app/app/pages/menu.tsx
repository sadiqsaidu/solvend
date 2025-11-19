import { useThemeStore } from "@/store/themeStore";
import { useWalletStore } from "@/store/walletStore";
import { Ionicons } from "@expo/vector-icons";
import { getUserEmbeddedSolanaWallet, usePrivy } from "@privy-io/expo";
import { PublicKey } from "@solana/web3.js";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Animated,
  Clipboard,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MenuScreen() {
  const { isDarkMode, colors, toggleTheme } = useThemeStore();
  const {
    userName,
    walletAddress,
    userProfilePicture,
    walletType,
    setUserName,
    setUserProfilePicture,
    disconnectWallet,
  } = useWalletStore();

  // Get Privy authentication
  const { user, logout } = usePrivy();
  const embeddedWallet = getUserEmbeddedSolanaWallet(user);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editedName, setEditedName] = useState(userName || "");
  const [tempProfilePicture, setTempProfilePicture] =
    useState(userProfilePicture);

  // Helper function to get display address
  // For external wallets: convert to base58 if needed
  // For embedded wallets: keep as-is (base64)
  const getDisplayAddress = (): string => {
    if (!walletAddress) return "0x1234...5678";

    // External wallet should be displayed in base58
    if (walletType === "external") {
      try {
        // If it's already base58, return as-is
        if (
          !walletAddress.includes("=") &&
          !walletAddress.includes("+") &&
          !walletAddress.includes("/")
        ) {
          return walletAddress;
        }
        // If it's base64, convert to base58
        const buffer = Buffer.from(walletAddress, "base64");
        const publicKey = new PublicKey(buffer);
        return publicKey.toBase58();
      } catch (error) {
        console.error("Error converting external wallet address:", error);
        return walletAddress;
      }
    }

    // Embedded wallet stays in base64
    return walletAddress;
  };

  const handlePickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant camera roll permissions to change your profile picture."
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setTempProfilePicture(result.assets[0].uri);
    }
  };

  const handleSaveProfile = () => {
    if (editedName.trim()) {
      setUserName(editedName.trim());
    }
    if (tempProfilePicture) {
      setUserProfilePicture(tempProfilePicture);
    }
    setShowEditModal(false);
  };

  const handleOpenEditModal = () => {
    setEditedName(userName || "");
    setTempProfilePicture(userProfilePicture);
    setShowEditModal(true);
  };

  const handleDisconnect = async () => {
    try {
      // Check if user is authenticated with Privy
      if (user && embeddedWallet) {
        // User logged in with Privy (OAuth) - logout from Privy
        await logout();
      }

      // Clear wallet store (works for both Privy and external wallet)
      disconnectWallet();

      // Navigate to login screen
      router.replace("/pages/LoginScreen");
    } catch (error) {
      console.error("Error disconnecting:", error);
      Alert.alert(
        "Disconnect Error",
        "Failed to disconnect wallet. Please try again."
      );
    }
  };

  const menuItems = [
    // {
    //   icon: "wallet-outline",
    //   title: "My Wallet",
    //   subtitle: "View transactions",
    //   onPress: () => {},
    // },
    // {
    //   icon: "swap-horizontal-outline",
    //   title: "Swap Tokens",
    //   subtitle: "Exchange assets",
    //   onPress: () => {},
    // },
    {
      icon: "document-text-outline",
      title: "Transaction History",
      subtitle: "View all activities",
      onPress: () => {
        router.push("/pages/transactions");
      },
    },
    {
      icon: "shield-checkmark-outline",
      title: "Security",
      subtitle: "Manage security settings",
      onPress: () => {},
    },
    {
      icon: "help-circle-outline",
      title: "Support",
      subtitle: "Get help",
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.background }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Profile & Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={[
                styles.avatarGradient,
                { backgroundColor: colors.primary },
              ]}
            >
              <View style={styles.avatar}>
                {userProfilePicture ? (
                  <Image
                    source={{ uri: userProfilePicture }}
                    style={styles.profileImage}
                  />
                ) : (
                  <Ionicons name="person" size={40} color="#FFFFFF" />
                )}
              </View>
            </View>

            <Text
              style={[styles.userName, { color: colors.text, marginTop: 12 }]}
            >
              {userName || "User"}
            </Text>

            <View style={[styles.addressContainer, { marginTop: 8 }]}>
              <Text style={[styles.address, { color: colors.textSecondary }]}>
                {(() => {
                  const displayAddr = getDisplayAddress();
                  return `${displayAddr.slice(0, 6)}...${displayAddr.slice(-4)}`;
                })()}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Clipboard.setString(getDisplayAddress());
                }}
                style={styles.copyButton}
              >
                <Ionicons
                  name="copy-outline"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleOpenEditModal}
              style={[
                styles.editProfileButton,
                { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
              <Text
                style={{
                  color: "#FFFFFF",
                  marginLeft: 8,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Toggle Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons
                  name={isDarkMode ? "moon" : "sunny"}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                  Appearance
                </Text>
                <Text
                  style={[
                    styles.menuItemSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {isDarkMode ? "Dark Mode" : "Light Mode"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.switch,
                {
                  backgroundColor: isDarkMode ? colors.primary : colors.border,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.switchThumb,
                  {
                    transform: [{ translateX: isDarkMode ? 22 : 2 }],
                  },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View>
                  <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.menuItemSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            { backgroundColor: colors.error + "20", borderColor: colors.error },
          ]}
          activeOpacity={0.7}
          onPress={handleDisconnect}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>
            {walletType === "embedded" ? "Logout" : "Disconnect Wallet"}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Solvend v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Powered by Solana
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.background },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Edit Profile
                </Text>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Profile Picture Section */}
                <View style={styles.modalSection}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Profile Picture
                  </Text>
                  <TouchableOpacity
                    onPress={handlePickImage}
                    style={styles.imagePickerContainer}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.modalAvatarGradient,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <View style={styles.modalAvatar}>
                        {tempProfilePicture ? (
                          <Image
                            source={{ uri: tempProfilePicture }}
                            style={styles.modalProfileImage}
                          />
                        ) : (
                          <Ionicons name="person" size={50} color="#FFFFFF" />
                        )}
                      </View>
                    </View>
                    <View
                      style={[
                        styles.cameraIconContainer,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Ionicons name="camera" size={18} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                  <Text
                    style={[styles.imageHint, { color: colors.textSecondary }]}
                  >
                    Tap to change photo
                  </Text>
                </View>

                {/* Name Input Section */}
                <View style={styles.modalSection}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Display Name
                  </Text>
                  <TextInput
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      styles.nameInput,
                      {
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setShowEditModal(false)}
                    style={[
                      styles.modalButton,
                      styles.cancelButton,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.cancelButtonText, { color: colors.text }]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveProfile}
                    style={styles.modalButton}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.saveButtonGradient,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
  },
  editButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    marginBottom: 12,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  address: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  copyButton: {
    padding: 4,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    minHeight: 500,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSection: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  imagePickerContainer: {
    alignSelf: "center",
    position: "relative",
  },
  modalAvatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
  },
  modalAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  modalProfileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  imageHint: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 14,
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
