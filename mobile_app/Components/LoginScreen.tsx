import {
  LoginWithOAuthInput,
  useEmbeddedSolanaWallet,
  useLoginWithOAuth,
  usePrivy,
} from "@privy-io/expo";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";

export default function LoginScreen() {
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const { user } = usePrivy();
  const { create } = useEmbeddedSolanaWallet();

  const oauth = useLoginWithOAuth({
    onError: (err) => {
      console.log(err);
      setError(JSON.stringify(err.message));
    },
    onSuccess: async (user) => {
      console.log("User logged in successfully", user);

      // Check if user has a wallet, if not create one
      const hasWallet = user.linked_accounts.some(
        (account) =>
          account.type === "wallet" && account.wallet_client_type === "privy"
      );

      if (!hasWallet) {
        try {
          console.log("Creating wallet for new user...");
          await create?.();
          console.log("Wallet created successfully");
        } catch (error) {
          console.error("Error creating wallet:", error);
          setError("Failed to create wallet");
        }
      }
    },
  });

  // Alternative: Auto-create wallet when user logs in
  useEffect(() => {
    if (user) {
      const hasWallet = user.linked_accounts.some(
        (account) =>
          account.type === "wallet" && account.wallet_client_type === "privy"
      );

      if (!hasWallet && create) {
        console.log("Auto-creating wallet for new user...");
        create()
          .then(() => console.log("Wallet auto-created"))
          .catch((err) => console.error("Auto-create wallet error:", err));
      }
    }
  }, [user, create]);

  return (
    <View className="flex-1 justify-center items-center bg-red-500 p-4">
      <Text className="text-2xl font-bold text-white mb-4">
        Welcome to Solvend
      </Text>
      <Text className="text-white mb-8">Login to create your wallet</Text>

      {["google", "github", "discord", "twitter"].map((provider) => (
        <View key={provider} className="mb-2 w-full">
          <Button
            title={`Login with ${provider}`}
            disabled={oauth.state.status === "loading"}
            onPress={() => oauth.login({ provider } as LoginWithOAuthInput)}
          />
        </View>
      ))}

      {oauth.state.status === "loading" && (
        <ActivityIndicator size="large" color="#FFFFFF" className="mt-4" />
      )}

      {error && (
        <Text className="text-red-200 mt-4 p-2 bg-red-700 rounded">
          Error: {error}
        </Text>
      )}
    </View>
  );
}
