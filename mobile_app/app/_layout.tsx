//Must be the first import
import { ThemeProvider } from "@/context/ThemeContext";
import { WalletProvider } from "@/context/WalletContext";
import "../global.css";
//rest
import { PrivyProvider } from "@privy-io/expo";
import Constants from "expo-constants";
import { Slot } from "expo-router";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <PrivyProvider
          appId={Constants.expoConfig?.extra?.privyAppId}
          clientId={Constants.expoConfig?.extra?.privyClientId}
        >
          <Slot />
        </PrivyProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
