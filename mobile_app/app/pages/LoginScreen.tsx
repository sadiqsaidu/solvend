import images from "@/constants/images";
import { useThemeStore } from "@/store/themeStore";
import { useWalletStore } from "@/store/walletStore";
import { Ionicons } from "@expo/vector-icons";
import {
  useEmbeddedSolanaWallet,
  useLoginWithOAuth,
  usePrivy,
} from "@privy-io/expo";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { PublicKey } from "@solana/web3.js";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const [error, setError] = useState("");
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const { colors, isDarkMode } = useThemeStore();
  const { user, logout } = usePrivy();
  const { create } = useEmbeddedSolanaWallet();
  const { setWalletAddress, setWalletType, setAuthenticated } =
    useWalletStore();

  // OAuth Login
  const oauth = useLoginWithOAuth({
    onError: (err) => {
      console.log("OAuth error:", err);
      setError(err.message);
      setIsNavigating(false);
    },
    onSuccess: async (user) => {
      console.log("OAuth login successful", user);
      setIsNavigating(true);

      // Auto-create embedded wallet for OAuth users
      const hasWallet = user.linked_accounts.some(
        (account) =>
          account.type === "wallet" && account.wallet_client_type === "privy"
      );
      if (!hasWallet) {
        try {
          await create?.();
          console.log("Embedded wallet created");
        } catch (error) {
          console.error("Error creating wallet:", error);
        }
      }

      // Set authentication state
      setAuthenticated(true);
      setWalletType("embedded");

      // Navigate to home screen after a brief delay
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 1500);
    },
  });

  // Solana Mobile Wallet Adapter
  const connectWallet = async () => {
    setIsLoading(true);
    setError("");

    try {
      await transact(async (wallet) => {
        // Authorize the wallet
        const authResult = await wallet.authorize({
          cluster: "devnet", // Changed from mainnet-beta to devnet to match app configuration
          identity: {
            name: "Solvend",
            uri: "https://solvend.app",
            icon: "./assets/solvend.png",
          },
        });

        // Get the first authorized account
        const account = authResult.accounts[0];

        // The address can be either Uint8Array or string depending on wallet
        let address: string;
        if (typeof account.address === "string") {
          address = account.address;
        } else {
          // Convert Uint8Array to PublicKey then to base58
          const publicKey = new PublicKey(account.address);
          address = publicKey.toBase58();
        }

        console.log("Connected wallet:", address);
        setConnectedWallet(address);
        setIsNavigating(true);

        // Store wallet info
        setWalletAddress(address);
        setWalletType("external");
        setAuthenticated(true);

        // Navigate to home screen after a brief delay
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 1500);
      });
    } catch (err: any) {
      console.error("Wallet connection error:", err);
      const errorMessage = err.message || "Failed to connect wallet";

      // Provide helpful error messages
      if (errorMessage.includes("No MWA-compatible wallet app found")) {
        setError(
          "No Solana wallet app found. Please install Phantom, Solflare, or another Solana wallet app."
        );
      } else if (errorMessage.includes("Non-base58")) {
        setError(
          "Invalid wallet address format. Please make sure you have a valid Solana wallet app installed."
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen when navigating
  if (isNavigating) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <View className="flex-1 justify-center items-center px-6">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={{ color: colors.text }}
            className="text-xl font-semibold mt-6 text-center"
          >
            Preparing your account
          </Text>
          <Text
            style={{ color: colors.textSecondary }}
            className="text-base mt-2 text-center"
          >
            {connectedWallet
              ? "Connected with your wallet"
              : "Setting up your embedded wallet"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center py-16">
          <View className="mb-12">
            <Text
              style={{ color: colors.text }}
              className="text-3xl font-semibold"
            >
              Welcome
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="text-base mt-3"
            >
              Sign in with a wallet or continue with Google to access your
              account.
            </Text>
          </View>

          <View className="gap-4">
            <TouchableOpacity
              onPress={connectWallet}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.primary,
                paddingVertical: 18,
                borderRadius: 14,
                opacity: isLoading ? 0.6 : 1,
              }}
              // className="py-2"
            >
              <View className="flex flex-row justify-center items-center gap-4">
                <Image
                  source={images.solana}
                  className="w-5 h-5"
                  style={{ tintColor: colors.primary }}
                />
                <Text
                  style={{ color: colors.primary }}
                  className="text-xl font-semibold text-center"
                >
                  Connect Solana Wallet
                </Text>
              </View>
              {/*
             <Text
                style={{ color: colors.background + "BF" }}
                className="text-sm text-center mt-2"
              >
                Works with Phantom, Solflare...
              </Text>
            */}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isLoading}
              activeOpacity={0.85}
              onPress={() => oauth.login({ provider: "google" })}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 14,
                paddingVertical: 18,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: isLoading ? 0.6 : 1,
                marginTop: 16,
              }}
            >
              <View className="flex flex-row justify-center items-center gap-4">
                <Ionicons name="logo-google" size={20} color={colors.text} />
                <Text
                  style={{ color: colors.text }}
                  className="text-xl font-semibold text-center"
                >
                  Continue with Google
                </Text>
              </View>
              {/* <Text
                style={{ color: colors.textSecondary }}
                className="text-sm text-center mt-2"
              >
                We’ll create a secure embedded wallet {"\n"} for you
              </Text> */}
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View className="items-center mt-8">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={{ color: colors.textSecondary }}
                className="text-sm mt-3"
              >
                Connecting to wallet...
              </Text>
            </View>
          )}

          {error && (
            <View
              style={{
                backgroundColor: colors.error + "15",
                borderColor: colors.error + "33",
                borderWidth: 1,
                borderRadius: 12,
              }}
              className="p-4 mt-6"
            >
              <Text
                style={{ color: colors.error }}
                className="text-sm font-semibold"
              >
                {error}
              </Text>
            </View>
          )}

          {/* <Text
            style={{ color: colors.textSecondary }}
            className="text-xs text-center mt-12 leading-5"
          >
            By continuing you agree to the Solvend Terms of Service and Privacy
            Policy.
          </Text> */}
        </View>
      </ScrollView>
    </View>
  );
}
