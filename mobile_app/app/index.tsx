// import LoginScreen from "@/Components/LoginScreen";
import { usePrivy } from "@privy-io/expo";
import HomeScreen from "./(tabs)";
import SplashScreen from "./pages/splash";
export default function Index() {
  const { user } = usePrivy();
  return !user ? <SplashScreen /> : <HomeScreen />;
  // return !user ? <SplashScreen /> : <HomePage />;
  // return <SplashScreen />;
}

// privy://auth
// com.abkgami.privy://auth
// exp://localhost:8081
// exp://127.0.0.1:8081
// --- IGNORE ---
