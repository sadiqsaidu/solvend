import { getUserEmbeddedSolanaWallet, usePrivy } from "@privy-io/expo";
import React from "react";
import { Button, Text, View } from "react-native";

export default function HomePage() {
  const { logout, user } = usePrivy();
  const account = getUserEmbeddedSolanaWallet(user);

  return (
    <View className="flex-1 p-4 justify-center items-center bg-white">
      <Text>Hello user </Text>
      <Button title="Logout" onPress={logout} />
      <Text> Welcome {account?.address}</Text>
    </View>
  );
}
