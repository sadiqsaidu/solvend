import SliderButton from "@/Components/SliderButton";
import images from "@/constants/images";
import { useThemeStore } from "@/store/themeStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useWalletStore } from "@/store/walletStore";
import {
  confirmTransaction,
  createUSDCPaymentTransaction,
} from "@/utils/solanaPayUtils";
import { connection, getWalletBalances } from "@/utils/solanaUtils";
import { SolvendAPI } from "@/utils/solvend API";
import { Ionicons } from "@expo/vector-icons";
import {
  getUserEmbeddedSolanaWallet,
  useEmbeddedSolanaWallet,
  usePrivy,
} from "@privy-io/expo";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { PublicKey } from "@solana/web3.js";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Image,
  ImageSourcePropType,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface DrinkItem {
  id: string;
  name: string;
  price: number;
  image: ImageSourcePropType;
}

const drinks: DrinkItem[] = [
  {
    id: "1",
    name: "Coca Cola",
    price: 0.45,
    image: images.cola,
  },
  {
    id: "4",
    name: "Red Bull",
    price: 0.83, //0.83
    image: images.energy,
  },
  {
    id: "2",
    name: "Fanta",
    price: 0.45,
    image: images.fizz,
  },
  {
    id: "3",
    name: "Sprite",
    price: 0.45,
    image: images.lemon,
  },
  {
    id: "5",
    name: "Pepsi",
    price: 0.45,
    image: images.pepsi,
  },
  {
    id: "6",
    name: "Maltina",
    price: 0.48,
    image: images.maltina,
  },
];

import { BottleProgressModal } from "@/Components/BottleProgressModal";
import { useAchievementStore } from "@/store/achievementStore";
import { Transaction } from "@/store/transactionStore";

export default function HomeScreen() {
  const [selectedDrink, setSelectedDrink] = useState<DrinkItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressStep, setProgressStep] = useState(1);
  const [progressMessage, setProgressMessage] = useState("");
  const [showBottleProgressModal, setShowBottleProgressModal] = useState(false);
  const [showFaucetModal, setShowFaucetModal] = useState(false);
  const [hasShownFaucetModal, setHasShownFaucetModal] = useState(false);

  // Get achievements state
  const { purchaseProgress } = useAchievementStore();

  // Custom alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertOtp, setAlertOtp] = useState<string | null>(null); // For OTP display
  const [alertButtons, setAlertButtons] = useState<
    Array<{ text: string; onPress?: () => void; style?: string }>
  >([]);

  // Solana balances state for external wallets
  const [tokenBalances, setTokenBalances] = useState<{
    sol: number;
    usdc: number;
  } | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const {
    walletAddress: storedWalletAddress,
    walletType: storedWalletType,
    setWalletAddress,
    isAuthenticated: storedAuthState,
    setAuthenticated,
    userName,
  } = useWalletStore();
  const { colors, isDarkMode } = useThemeStore();
  const { addTransaction, getRecentTransactions } = useTransactionStore();
  const transactions = getRecentTransactions(3);

  // Get user profile picture from wallet store
  const { userProfilePicture } = useWalletStore();

  // Privy authentication
  const { user, isReady, logout } = usePrivy();
  const embeddedWallet = getUserEmbeddedSolanaWallet(user);
  const embeddedSolanaWallet = useEmbeddedSolanaWallet();

  // Determine wallet address - prioritize stored wallet type
  const walletAddress =
    storedWalletType === "external"
      ? storedWalletAddress
      : embeddedWallet?.address || storedWalletAddress;
  const walletType =
    storedWalletType ||
    (embeddedWallet ? "embedded" : storedWalletAddress ? "external" : null);

  // Update wallet address in store when it changes
  useEffect(() => {
    if (walletAddress && walletAddress !== storedWalletAddress) {
      setWalletAddress(walletAddress);
    }
  }, [walletAddress, storedWalletAddress, setWalletAddress]);

  // Store authentication state when user is authenticated
  useEffect(() => {
    if (user && !storedAuthState) {
      setAuthenticated(true);
    }
  }, [user, storedAuthState, setAuthenticated]);

  // Custom alert function to replace Alert.alert
  const showCustomAlert = (
    title: string,
    message: string,
    buttons?: Array<{ text: string; onPress?: () => void; style?: string }>,
    otp?: string
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOtp(otp || null);
    setAlertButtons(
      buttons || [{ text: "OK", onPress: () => setShowAlertModal(false) }]
    );
    setShowAlertModal(true);
  };

  // Fetch Solana balances for both external and embedded wallets
  const fetchTokenBalances = async () => {
    // Validate wallet address before attempting to fetch
    if (
      !walletAddress ||
      typeof walletAddress !== "string" ||
      walletAddress.trim() === ""
    ) {
      console.log(
        "No valid wallet address available. Current value:",
        walletAddress
      );
      return;
    }

    console.log("Fetching balances for wallet:", walletAddress);
    setIsLoadingBalances(true);
    setBalanceError(null);

    try {
      // Convert base64 to base58 if needed (Privy returns base64)
      let publicKeyToUse: PublicKey;

      if (
        walletAddress.includes("=") ||
        walletAddress.includes("+") ||
        walletAddress.includes("/")
      ) {
        // This looks like base64, convert it
        console.log("Detected base64 address, converting to base58...");
        const buffer = Buffer.from(walletAddress, "base64");
        publicKeyToUse = new PublicKey(buffer);
        console.log("Converted to base58:", publicKeyToUse.toBase58());
      } else {
        // Already base58
        publicKeyToUse = new PublicKey(walletAddress);
      }

      console.log("Valid PublicKey created:", publicKeyToUse.toBase58());
      const balances = await getWalletBalances(publicKeyToUse);
      console.log("Balances fetched:", balances);
      setTokenBalances(balances);
      setBalanceError(null);

      // Show faucet modal if USDC balance is less than 1 and hasn't been shown before
      if (balances.usdc < 1 && !hasShownFaucetModal) {
        setShowFaucetModal(true);
        setHasShownFaucetModal(true);
      }
      // Automatically close faucet modal if USDC balance is now sufficient
      else if (balances.usdc >= 1 && showFaucetModal) {
        setShowFaucetModal(false);
      }
    } catch (error: any) {
      console.error("Error fetching balances:", error);
      console.error("Invalid wallet address:", walletAddress);

      // Check if it's a network error
      if (
        error?.message?.includes("Network request failed") ||
        error?.message?.includes("fetch failed") ||
        error?.message?.includes("timeout")
      ) {
        setBalanceError(
          "Network connection issue. Please check your internet."
        );
      } else {
        setBalanceError("Unable to fetch balances. Please try again.");
      }

      // Set default values on error
      setTokenBalances({ sol: 0, usdc: 0 });
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Fetch balances when wallet is connected (both external and embedded)
  useEffect(() => {
    if (
      walletAddress &&
      typeof walletAddress === "string" &&
      walletAddress.trim() !== ""
    ) {
      fetchTokenBalances();

      // Refresh balances every 30 seconds
      const interval = setInterval(fetchTokenBalances, 30000);
      return () => clearInterval(interval);
    }
  }, [walletAddress]);

  // Helper function to get display address
  // For external wallets: convert to base58 if needed
  // For embedded wallets: keep as-is (base64)
  const getDisplayAddress = (): string => {
    if (!walletAddress) return "";

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

  const handleAirdrop = async () => {
    if (!walletAddress) {
      showCustomAlert("Error", "No wallet connected");
      return;
    }

    // Show options modal for airdrop
    showCustomAlert(
      "Get Devnet USDC",
      "Choose how you would like to receive Devnet USDC:",
      [
        {
          text: "Request Devnet USDC",
          onPress: async () => {
            setShowAlertModal(false);
            handleSolanaAirdrop();
          },
        },
        {
          text: "Request USDC from Developer",
          onPress: async () => {
            setShowAlertModal(false);
            const mailtoUrl = `mailto:yahabubakar2504@gmail.com?subject=Devnet USDC Request&body=Please fund my wallet address with devnet USDC: ${walletAddress}`;
            await Linking.openURL(mailtoUrl);
            showCustomAlert(
              "Request Sent",
              "Email request prepared. Please send the email and check back later."
            );
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setShowAlertModal(false),
        },
      ]
    );
  };

  const handleSolanaAirdrop = async () => {
    // Helper to get PublicKey from walletAddress
    const getPublicKey = (address: string) => {
      if (
        address.includes("=") ||
        address.includes("+") ||
        address.includes("/")
      ) {
        // Base64 address
        const buffer = Buffer.from(address, "base64");
        return new PublicKey(buffer);
      } else {
        // Base58 address
        return new PublicKey(address);
      }
    };

    try {
      // Always fetch latest balances before airdrop
      await fetchTokenBalances();
      const solBalance = tokenBalances?.sol ?? 0;
      let publicKey: PublicKey;
      try {
        publicKey = getPublicKey(walletAddress ?? "");
      } catch (error) {
        showCustomAlert("Error", "Invalid wallet address format");
        return;
      }

      // 1. If SOL < 0.2, request 1 SOL airdrop
      if (solBalance < 0.2) {
        showCustomAlert(
          "Requesting SOL Airdrop",
          "Your SOL balance is low. Requesting 1 SOL from the devnet faucet...",
          [{ text: "Please Wait", onPress: () => {}, style: "cancel" }]
        );
        try {
          const signature = await connection.requestAirdrop(
            publicKey,
            1 * 1_000_000_000 // 1 SOL in lamports
          );
          await connection.confirmTransaction(signature, "confirmed");
          addTransaction({
            type: "credit",
            category: "topup",
            amount: 1,
            status: "completed",
            description: "Devnet SOL Airdrop",
          });
          // After SOL airdrop, prompt for USDC-Dev
          showCustomAlert(
            "Airdrop Successful! 🎉",
            "1 SOL has been added to your wallet. Now request 1000 USDC-Dev from the SPL Token Faucet (browser will open).",
            [
              {
                text: "Open USDC Faucet",
                onPress: () => {
                  setShowAlertModal(false);
                  const url = `https://spl-token-faucet.com/?token-name=USDC-Dev&recipient=${publicKey.toBase58()}&amount=1000`;
                  // @ts-ignore
                  if (typeof window !== "undefined" && window.open) {
                    window.open(url, "_blank");
                  } else {
                    import("react-native").then(({ Linking }) =>
                      Linking.openURL(url)
                    );
                  }
                },
              },
              { text: "OK", onPress: () => setShowAlertModal(false) },
            ]
          );
        } catch (error: any) {
          let errorMessage = "Failed to request SOL airdrop. Please try again.";
          if (
            error?.message?.includes("airdrop request limit") ||
            error?.message?.includes("429")
          ) {
            errorMessage =
              "Airdrop limit reached or faucet is dry. Please visit https://faucet.solana.com for more test SOL.";
          }
          showCustomAlert("SOL Airdrop Failed", errorMessage, [
            {
              text: "Open Faucet",
              onPress: () => {
                setShowAlertModal(false);
                const url = `https://faucet.solana.com/?recipient=${publicKey.toBase58()}`;
                // @ts-ignore
                if (typeof window !== "undefined" && window.open) {
                  window.open(url, "_blank");
                } else {
                  import("react-native").then(({ Linking }) =>
                    Linking.openURL(url)
                  );
                }
              },
            },
            { text: "OK", onPress: () => setShowAlertModal(false) },
          ]);
        }
        // Refresh balances after airdrop
        await fetchTokenBalances();
      } else {
        // If SOL >= 0.2, just prompt for USDC-Dev
        showCustomAlert(
          "USDC Faucet",
          "To make a transaction, request 1,000 USDC-Dev from the SPL Token Faucet.\n(Opens in a new tab — available for Devnet wallets only.)",
          [
            {
              text: "Open USDC Faucet",
              onPress: () => {
                setShowAlertModal(false);
                const url = `https://spl-token-faucet.com/?token-name=USDC-Dev&recipient=${publicKey.toBase58()}&amount=1000`;
                // @ts-ignore
                if (typeof window !== "undefined" && window.open) {
                  window.open(url, "_blank");
                } else {
                  import("react-native").then(({ Linking }) =>
                    Linking.openURL(url)
                  );
                }
              },
            },
            { text: "OK", onPress: () => setShowAlertModal(false) },
          ]
        );
      }
    } catch (error: any) {
      console.error("Airdrop error:", error);
      showCustomAlert(
        "Airdrop Failed",
        "Failed to request airdrop. Please try again."
      );
    }
  };
  const handleDrinkSelect = (drink: DrinkItem) => {
    setSelectedDrink(drink);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDrink(null);
  };

  const handlePayFromWallet = async () => {
    if (!selectedDrink) return;

    // Both external and embedded wallets now use Solana Pay
    if (walletType === "external") {
      await handleExternalWalletPayment();
    } else if (walletType === "embedded") {
      await handleEmbeddedWalletPayment();
    } else {
      showCustomAlert("Error", "No wallet connected");
    }
  };

  // Handle payment with external wallet using Solana Pay + Solvend API
  const handleExternalWalletPayment = async () => {
    if (!selectedDrink || !walletAddress) return;

    try {
      showCustomAlert(
        "Confirm Payment",
        `Pay ${selectedDrink.price.toFixed(2)} USDC for ${selectedDrink.name}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setShowAlertModal(false),
          },
          {
            text: "Pay",
            onPress: async () => {
              try {
                setShowAlertModal(false);
                closeModal(); // Close the confirm purchase modal
                console.log("Starting Solvend purchase flow...");

                // Show progress modal (same as embedded wallet)
                setShowProgressModal(true);
                setProgressStep(1);
                setProgressMessage("Preparing your payment...");

                // STEP 1: Create purchase on Solvend backend
                console.log("Step 1: Creating purchase on Solvend backend...");
                setProgressStep(2);
                setProgressMessage("Creating your order...");

                // Convert wallet address to base58 for backend
                let base58WalletAddress = walletAddress;
                if (
                  walletAddress.includes("=") ||
                  walletAddress.includes("+") ||
                  walletAddress.includes("/")
                ) {
                  // Convert base64 to base58
                  const buffer = Buffer.from(walletAddress, "base64");
                  const publicKey = new PublicKey(buffer);
                  base58WalletAddress = publicKey.toBase58();
                  console.log(
                    "Converted wallet address to base58:",
                    base58WalletAddress
                  );
                }

                const purchase = await SolvendAPI.Purchase.createPurchase({
                  userWallet: base58WalletAddress,
                  amount: Math.round(selectedDrink.price * 1_000_000), // Convert USDC to micro-USDC
                });

                console.log("Purchase created:", purchase);
                console.log("Reference ID:", purchase.referenceId);
                console.log("Treasury:", purchase.treasuryTokenAccount);

                // STEP 2: Build transaction
                console.log("Step 2: Building transaction...");
                setProgressStep(3);
                setProgressMessage("Building your transaction...");

                // Pre-build transaction details before opening wallet
                const referenceId = purchase.referenceId;
                console.log("Reference ID for tracking:", referenceId);

                // STEP 3: Sign and send transaction using Mobile Wallet Adapter
                console.log("Step 3: Opening your wallet...");
                setProgressStep(4);
                setProgressMessage("Opening your wallet app...");

                // Small delay to show the progress
                await new Promise((resolve) => setTimeout(resolve, 500));

                const result = await transact(async (wallet) => {
                  console.log("Wallet connected, authorizing...");

                  // Update progress - now in wallet
                  setProgressMessage("Authorizing with wallet...");

                  // Authorize the wallet first to get the actual public key
                  // ⚠️ IMPORTANT: Must match backend network (devnet or mainnet-beta)
                  const authResult = await wallet.authorize({
                    cluster: "devnet", // Match backend SOLANA_RPC_URL
                    identity: { name: "SolVend" },
                  });

                  console.log(
                    "Authorization successful, processing address..."
                  );

                  // Get the first account's public key
                  // The address can be either Uint8Array or base64 string
                  const addressData: Uint8Array | string = authResult
                    .accounts[0].address as Uint8Array | string;
                  console.log("Address type:", typeof addressData);
                  console.log("Address data:", addressData);

                  let authorizedPubkey: PublicKey;
                  if (addressData instanceof Uint8Array) {
                    console.log("Converting from Uint8Array...");
                    authorizedPubkey = new PublicKey(addressData);
                  } else if (typeof addressData === "string") {
                    console.log("Converting from string...");
                    // Try base64 decode first
                    try {
                      const buffer = Buffer.from(addressData, "base64");
                      authorizedPubkey = new PublicKey(buffer);
                      console.log("Decoded from base64");
                    } catch (e) {
                      console.log("Base64 failed, trying base58...");
                      // If base64 fails, try as base58
                      authorizedPubkey = new PublicKey(addressData);
                    }
                  } else {
                    throw new Error("Unknown address format");
                  }

                  console.log(
                    "Authorized with pubkey:",
                    authorizedPubkey.toBase58()
                  );

                  // Create USDC payment transaction with the authorized wallet's public key
                  // Pass the referenceId as a memo for backend tracking
                  console.log("Creating transaction...");

                  // Update progress
                  setProgressMessage("Creating payment transaction...");

                  let transaction;
                  try {
                    transaction = await createUSDCPaymentTransaction(
                      authorizedPubkey,
                      selectedDrink.price,
                      referenceId // Pass as memo string
                    );
                    console.log("✅ Transaction created successfully");
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    console.log("📋 TRANSACTION DETAILS:");
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    console.log("💰 Amount:", selectedDrink.price, "USDC");
                    console.log("👤 Payer:", authorizedPubkey.toBase58());
                    console.log("🎫 Reference ID:", referenceId);
                    console.log(
                      "💳 Fee Payer:",
                      transaction.feePayer?.toBase58()
                    );
                    console.log("🔗 Recent Blockhash:", transaction);
                    console.log(
                      "📝 Instructions:",
                      transaction.instructions.length
                    );
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

                    // Log each instruction
                    transaction.instructions.forEach((ix, idx) => {
                      console.log(`Instruction ${idx + 1}:`, {
                        programId: ix.programId.toBase58(),
                        keys: ix.keys.length,
                        data: ix.data.length + " bytes",
                      });
                    });
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                  } catch (txError: any) {
                    console.error("❌ Failed to create transaction:", txError);
                    console.error("   Error message:", txError?.message);
                    console.error("   Error stack:", txError?.stack);
                    throw txError;
                  }

                  console.log(
                    "Requesting wallet to sign and send transaction..."
                  );

                  // Update progress
                  setProgressMessage("Requesting signature from wallet...");

                  // Add timeout wrapper to prevent infinite hanging
                  const signTransactionWithTimeout = async () => {
                    const timeoutPromise = new Promise((_, reject) =>
                      setTimeout(
                        () =>
                          reject(
                            new Error("Wallet signing timeout after 60 seconds")
                          ),
                        60000
                      )
                    );

                    const signingPromise = wallet.signAndSendTransactions({
                      transactions: [transaction],
                    });

                    return Promise.race([signingPromise, timeoutPromise]);
                  };

                  let result: any;
                  try {
                    result = await signTransactionWithTimeout();
                    console.log("✅ Wallet signing completed");

                    // Update progress - back from wallet
                    setProgressMessage("Transaction signed successfully!");
                  } catch (signError: any) {
                    console.error("❌ Wallet signing error:", signError);
                    console.error("Error message:", signError?.message);
                    console.error("Error type:", signError?.constructor?.name);
                    throw signError;
                  }

                  // Extract signature from response
                  let signature: string;
                  if (result.signatures && Array.isArray(result.signatures)) {
                    signature = result.signatures[0];
                  } else if (Array.isArray(result)) {
                    signature = result[0];
                  } else if (typeof result === "string") {
                    signature = result;
                  } else if (result?.signature) {
                    signature = result.signature;
                  } else {
                    console.error("Unknown response format:", result);
                    throw new Error("Unexpected response format from wallet");
                  }

                  console.log("Transaction sent by wallet:", signature);
                  return signature;
                });

                console.log(
                  "Transaction submitted, waiting for confirmation..."
                );

                // Update progress
                setProgressStep(5);
                setProgressMessage("Sending payment to blockchain...");

                // Wait for confirmation
                setProgressStep(6);
                setProgressMessage("Confirming your payment...");

                const confirmed = await confirmTransaction(result);

                if (confirmed) {
                  // STEP 4: Payment confirmed
                  console.log("Transaction confirmed:", result);
                  setProgressStep(7);
                  setProgressMessage("Payment complete!");

                  // Add transaction to history
                  addTransaction({
                    type: "debit",
                    category: "purchase",
                    amount: selectedDrink.price,
                    status: "completed",
                    description: `${selectedDrink.name} Purchase`,
                  });

                  // Refresh balances
                  await fetchTokenBalances();

                  // Close progress modal and show achievement progress
                  setTimeout(() => {
                    setShowProgressModal(false);

                    // Add purchase progress first
                    useAchievementStore.getState().addPurchaseProgress();
                    const currentProgress =
                      useAchievementStore.getState().purchaseProgress;

                    // Show bottle progress modal after a 1-second delay from OTP modal
                    setTimeout(() => {
                      setShowBottleProgressModal(true);
                      setTimeout(() => setShowBottleProgressModal(false), 3000);
                    }, 1000);
                  }, 1000); // Immediately confirm payment and get OTP
                  try {
                    const confirmResult =
                      await SolvendAPI.Purchase.confirmPayment(
                        purchase.referenceId,
                        result
                      );

                    if (confirmResult.otp) {
                      console.log(
                        "✅ OTP received immediately:",
                        confirmResult.otp
                      );
                      showCustomAlert(
                        "Payment Complete! 🎉",
                        `Use this OTP at the vending machine to retrive your ${selectedDrink.name}.`,
                        [
                          {
                            text: "Copy OTP",
                            onPress: () => {
                              Clipboard.setString(confirmResult.otp);
                              setShowAlertModal(false);
                              showCustomAlert(
                                "Copied!",
                                "OTP copied to clipboard"
                              );
                            },
                          },
                          {
                            text: "Close",
                            onPress: () => {
                              setShowAlertModal(false);
                              closeModal();
                              // router.push("../pages/otp-validation");
                            },
                          },
                        ],
                        confirmResult.otp
                      );
                      return;
                    }
                  } catch (confirmError) {
                    console.log(
                      "Immediate confirmation failed, falling back to polling:",
                      confirmError
                    );
                  }

                  // Fallback: Poll for OTP from backend if immediate confirmation failed
                  console.log("Starting OTP polling...");
                  const pollForOtp = async () => {
                    for (let i = 0; i < 60; i++) {
                      // Try for 60 seconds (backend polls every 10s)
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      try {
                        const status =
                          await SolvendAPI.Purchase.getPurchaseStatus(
                            purchase.referenceId
                          );
                        console.log(`Poll attempt ${i + 1}:`, status);

                        if (status.status === "VOUCHER_CREATED" && status.otp) {
                          console.log("✅ OTP received:", status.otp);
                          showCustomAlert(
                            "Payment Complete! 🎉",
                            `Use this OTP at the vending machine to retrive your ${selectedDrink.name}.`,
                            [
                              {
                                text: "Copy OTP",
                                onPress: () => {
                                  Clipboard.setString(status.otp!);
                                  setShowAlertModal(false);
                                  showCustomAlert(
                                    "Copied!",
                                    "OTP copied to clipboard"
                                  );
                                },
                              },
                              {
                                text: "Close",
                                onPress: () => {
                                  setShowAlertModal(false);
                                  closeModal();
                                  // router.push("../pages/otp-validation");
                                },
                              },
                            ],
                            status.otp
                          );
                          return;
                        }
                      } catch (err) {
                        console.log("Polling error:", err);
                      }
                    }
                    // Timeout - OTP not received
                    console.log("⏱️ OTP polling timeout");
                    showCustomAlert(
                      "Payment Confirmed",
                      `Payment confirmed for ${selectedDrink.name}!\n\nReference ID: ${purchase.referenceId}\n\nPlease check back in a moment for your OTP.`,
                      [
                        {
                          text: "OK",
                          onPress: () => {
                            setShowAlertModal(false);
                            closeModal();
                          },
                        },
                      ]
                    );
                  };
                  pollForOtp();
                } else {
                  setShowProgressModal(false);
                  showCustomAlert(
                    "Payment Failed",
                    "Transaction could not be confirmed. Please try again."
                  );
                }
              } catch (error: any) {
                console.error("Payment error:", error);
                setShowProgressModal(false);

                // Handle specific error types
                let errorTitle = "Payment Error";
                let errorMessage =
                  "Failed to process payment. Please try again.";

                if (
                  error.message?.includes("declined") ||
                  error.message?.includes("rejected")
                ) {
                  errorTitle = "Transaction Declined";
                  errorMessage =
                    "You declined the transaction in your wallet. No charges were made.";
                } else if (
                  error.message?.includes("CancellationException") ||
                  error.message?.includes("cancelled") ||
                  error.message?.includes("canceled")
                ) {
                  errorTitle = "Payment Cancelled";
                  errorMessage =
                    "You cancelled the transaction. No charges were made.";
                } else if (error.message?.includes("insufficient")) {
                  errorTitle = "Insufficient Balance";
                  errorMessage =
                    "You don't have enough USDC or SOL for this transaction.";
                } else if (
                  error.message?.includes("timeout") ||
                  error.message?.includes("timed out")
                ) {
                  errorTitle = "Transaction Timeout";
                  errorMessage =
                    "The transaction took too long. Please try again.";
                } else if (error.message) {
                  errorMessage = error.message;
                }

                showCustomAlert(errorTitle, errorMessage);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error preparing payment:", error);
      showCustomAlert("Error", "Failed to prepare payment transaction");
    }
  };

  // Handle payment with embedded wallet (Google OAuth users)
  const handleEmbeddedWalletPayment = async () => {
    if (!selectedDrink || !walletAddress || !embeddedWallet) {
      showCustomAlert("Error", "Embedded wallet not available");
      return;
    }

    try {
      showCustomAlert(
        "Confirm Payment",
        `Pay ${selectedDrink.price.toFixed(2)} USDC for ${selectedDrink.name}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setShowAlertModal(false),
          },
          {
            text: "Pay",
            onPress: async () => {
              try {
                setShowAlertModal(false);
                closeModal(); // Close the confirm purchase modal
                console.log("Starting embedded wallet purchase flow...");

                // Show progress modal
                setShowProgressModal(true);
                setProgressStep(1);
                setProgressMessage("Preparing your payment...");

                // Convert wallet address to PublicKey (handle both base64 and base58)
                let userPubkey: PublicKey;
                try {
                  // Check if address is base64 (Privy returns base64)
                  if (
                    walletAddress.includes("=") ||
                    walletAddress.includes("+") ||
                    walletAddress.includes("/")
                  ) {
                    console.log("Converting base64 address to PublicKey...");
                    const buffer = Buffer.from(walletAddress, "base64");
                    userPubkey = new PublicKey(buffer);
                  } else {
                    // Already base58
                    console.log("Using base58 address directly...");
                    userPubkey = new PublicKey(walletAddress);
                  }
                  console.log("User pubkey:", userPubkey.toBase58());
                } catch (error) {
                  console.error("Failed to decode wallet address:", error);
                  setShowProgressModal(false);
                  throw new Error("Invalid wallet address format");
                }

                // STEP 1: Create purchase on Solvend backend
                console.log("Step 1: Creating purchase on Solvend backend...");
                setProgressStep(2);
                setProgressMessage("Creating your order...");

                // Convert wallet address to base58 for backend
                let base58WalletAddress = walletAddress;
                if (
                  walletAddress.includes("=") ||
                  walletAddress.includes("+") ||
                  walletAddress.includes("/")
                ) {
                  // Convert base64 to base58
                  const buffer = Buffer.from(walletAddress, "base64");
                  const publicKey = new PublicKey(buffer);
                  base58WalletAddress = publicKey.toBase58();
                  console.log(
                    "Converted wallet address to base58:",
                    base58WalletAddress
                  );
                }

                const purchase = await SolvendAPI.Purchase.createPurchase({
                  userWallet: base58WalletAddress,
                  amount: Math.round(selectedDrink.price * 1_000_000),
                });

                console.log("Purchase created:", purchase);
                console.log("Reference ID:", purchase.referenceId);
                console.log("Treasury:", purchase.treasuryTokenAccount);

                // STEP 2: Create and sign transaction with embedded wallet
                console.log("Step 2: Creating USDC payment transaction...");
                setProgressStep(3);
                setProgressMessage("Building your transaction...");

                const transaction = await createUSDCPaymentTransaction(
                  userPubkey,
                  selectedDrink.price,
                  purchase.referenceId
                );

                console.log("✅ Transaction created successfully");
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log("📋 TRANSACTION DETAILS (Embedded Wallet):");
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log("💰 Amount:", selectedDrink.price, "USDC");
                console.log("👤 Payer:", userPubkey.toBase58());
                console.log("🎫 Reference ID:", purchase.referenceId);
                console.log("💳 Fee Payer:", transaction.feePayer?.toBase58());
                console.log(
                  "🔗 Recent Blockhash:",
                  transaction.recentBlockhash
                );
                console.log(
                  "📝 Instructions:",
                  transaction.instructions.length
                );
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

                // Log each instruction
                transaction.instructions.forEach((ix, idx) => {
                  console.log(`Instruction ${idx + 1}:`, {
                    programId: ix.programId.toBase58(),
                    keys: ix.keys.length,
                    data: ix.data.length + " bytes",
                  });
                });
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

                console.log(
                  "Transaction created, signing with embedded wallet..."
                );

                // Get Privy embedded wallet provider
                console.log("Getting Privy embedded wallet provider...");
                setProgressStep(4);
                setProgressMessage("Requesting signature...");

                if (!embeddedSolanaWallet?.getProvider) {
                  setShowProgressModal(false);
                  throw new Error("Embedded wallet not properly initialized");
                }

                const provider = await embeddedSolanaWallet.getProvider();

                if (!provider) {
                  setShowProgressModal(false);
                  throw new Error("Failed to get embedded wallet provider");
                }

                console.log(
                  "Signing transaction with Privy embedded wallet..."
                );
                setProgressMessage("Signing with your wallet...");

                // Sign the transaction using Privy provider
                const { signedTransaction } = await provider.request({
                  method: "signTransaction",
                  params: {
                    transaction: transaction,
                  },
                });

                console.log("Transaction signed, sending to Solana network...");
                setProgressStep(5);
                setProgressMessage("Sending payment to blockchain...");

                // Send the signed transaction to Solana
                const signature = await connection.sendRawTransaction(
                  signedTransaction.serialize(),
                  {
                    skipPreflight: false,
                    preflightCommitment: "confirmed",
                  }
                );

                console.log("Transaction sent:", signature);
                console.log("Waiting for confirmation...");
                setProgressStep(6);
                setProgressMessage("Confirming your payment...");

                // Wait for confirmation
                const confirmed = await confirmTransaction(signature);

                if (confirmed) {
                  console.log("Transaction confirmed!");
                  setProgressStep(7);
                  setProgressMessage("Payment complete!");

                  // Add transaction to history
                  addTransaction({
                    type: "debit",
                    category: "purchase",
                    amount: selectedDrink.price,
                    status: "completed",
                    description: `${selectedDrink.name} Purchase`,
                  });

                  // Close progress modal and show achievement progress
                  setTimeout(() => {
                    setShowProgressModal(false);

                    // Add purchase progress first
                    useAchievementStore.getState().addPurchaseProgress();
                    const currentProgress =
                      useAchievementStore.getState().purchaseProgress;

                    // Show bottle progress modal after a 1-second delay
                    setTimeout(() => {
                      setShowBottleProgressModal(true);
                      setTimeout(() => setShowBottleProgressModal(false), 3000);
                    }, 1000);
                  }, 1000);

                  // Immediately confirm payment and get OTP
                  try {
                    const confirmResult =
                      await SolvendAPI.Purchase.confirmPayment(
                        purchase.referenceId,
                        signature
                      );

                    if (confirmResult.otp) {
                      console.log(
                        "✅ OTP received immediately:",
                        confirmResult.otp
                      );
                      showCustomAlert(
                        "Payment Complete! 🎉",
                        `Use this OTP at the vending machine to retrive your ${selectedDrink.name}.`,
                        [
                          {
                            text: "Copy OTP",
                            onPress: () => {
                              Clipboard.setString(confirmResult.otp);
                              setShowAlertModal(false);
                              showCustomAlert(
                                "Copied!",
                                "OTP copied to clipboard"
                              );
                            },
                          },
                          {
                            text: "Close",
                            onPress: () => {
                              setShowAlertModal(false);
                              closeModal();
                              // router.push("../pages/otp-validation");
                            },
                          },
                        ],
                        confirmResult.otp
                      );
                      return;
                    }
                  } catch (confirmError) {
                    console.log(
                      "Immediate confirmation failed, falling back to polling:",
                      confirmError
                    );
                  }

                  // Fallback: Poll for OTP from backend if immediate confirmation failed
                  console.log("Starting OTP polling...");
                  const pollForOtp = async () => {
                    for (let i = 0; i < 60; i++) {
                      // Try for 60 seconds (backend polls every 10s)
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      try {
                        const status =
                          await SolvendAPI.Purchase.getPurchaseStatus(
                            purchase.referenceId
                          );
                        console.log(`Poll attempt ${i + 1}:`, status);

                        if (status.status === "VOUCHER_CREATED" && status.otp) {
                          console.log("✅ OTP received:", status.otp);
                          showCustomAlert(
                            "Payment Complete! 🎉",
                            `Use this OTP at the vending machine to retrive your ${selectedDrink.name}.`,
                            [
                              {
                                text: "Copy OTP",
                                onPress: () => {
                                  Clipboard.setString(status.otp!);
                                  setShowAlertModal(false);
                                  showCustomAlert(
                                    "Copied!",
                                    "OTP copied to clipboard"
                                  );
                                },
                              },
                              {
                                text: "Close",
                                onPress: () => {
                                  setShowAlertModal(false);
                                  closeModal();
                                  // router.push("../pages/otp-validation");
                                },
                              },
                            ],
                            status.otp
                          );
                          return;
                        }
                      } catch (err) {
                        console.log("Polling error:", err);
                      }
                    }
                    // Timeout - OTP not received
                    console.log("⏱️ OTP polling timeout");
                    showCustomAlert(
                      "Payment Confirmed",
                      `Payment confirmed for ${selectedDrink.name}!\n\nReference ID: ${purchase.referenceId}\n\nPlease check back in a moment for your OTP.`,
                      [
                        {
                          text: "OK",
                          onPress: () => {
                            setShowAlertModal(false);
                            closeModal();
                          },
                        },
                      ]
                    );
                  };
                  pollForOtp();
                } else {
                  setShowProgressModal(false);
                  showCustomAlert(
                    "Payment Failed",
                    "Transaction could not be confirmed. Please try again."
                  );
                }
              } catch (error: any) {
                console.error("Embedded wallet payment error:", error);
                setShowProgressModal(false);

                let errorTitle = "Payment Error";
                let errorMessage =
                  "Failed to process payment. Please try again.";

                if (error.message?.includes("insufficient")) {
                  errorTitle = "Insufficient Balance";
                  errorMessage =
                    "You don't have enough USDC or SOL for this transaction.";
                } else if (
                  error.message?.includes("timeout") ||
                  error.message?.includes("timed out")
                ) {
                  errorTitle = "Transaction Timeout";
                  errorMessage =
                    "The transaction took too long. Please try again.";
                } else if (error.message?.includes("User rejected")) {
                  errorTitle = "Transaction Rejected";
                  errorMessage = "You rejected the transaction.";
                } else if (error.message) {
                  errorMessage = error.message;
                }

                showCustomAlert(errorTitle, errorMessage);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error preparing embedded wallet payment:", error);
      showCustomAlert("Error", "Failed to prepare payment transaction");
    }
  };

  const renderTransactionItem = (transaction: Transaction) => {
    const isCredit = transaction.type === "credit";

    // Convert timestamp to Date object
    const transactionDate = new Date(transaction.timestamp);
    const formattedDate = transactionDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <View
        key={transaction.id}
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        }}
        className="flex-row items-center justify-between rounded-2xl p-4 mb-3"
      >
        <View className="flex-row items-center">
          <View
            style={{
              backgroundColor: isCredit ? "#10B981" + "15" : "#EF4444" + "15",
            }}
            className="w-12 h-12 rounded-2xl justify-center items-center mr-3"
          >
            <Ionicons
              name={isCredit ? "arrow-down" : "arrow-up"}
              size={22}
              color={isCredit ? "#10B981" : "#EF4444"}
            />
          </View>
          <View className="flex">
            <Text
              numberOfLines={1}
              style={{ color: colors.text }}
              className="font-semibold text-base "
            >
              {/* {transaction.description} */}
              {transaction.description}
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="text-sm mt-1"
            >
              {formattedDate}
            </Text>
          </View>
        </View>
        <Text
          style={{ color: isCredit ? "#10B981" : "#EF4444" }}
          className="font-bold text-sm"
        >
          {isCredit ? "+" : "-"} {transaction.amount.toFixed(2)} USDC
        </Text>
      </View>
    );
  };

  // Show loading state while Privy initializes (only if not previously authenticated)
  if (!isReady && !storedAuthState) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text }} className="mt-4 text-lg">
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Redirect to login if not authenticated (and no stored auth state)
  if (!user && !storedAuthState) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 justify-center items-center px-6">
          <View
            style={{ backgroundColor: colors.primary + "20" }}
            className="w-24 h-24 rounded-full justify-center items-center mb-6"
          >
            <Ionicons
              name="lock-closed-outline"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text
            style={{ color: colors.text }}
            className="text-2xl font-bold mb-3 text-center"
          >
            Authentication Required
          </Text>
          <Text
            style={{ color: colors.textSecondary }}
            className="text-base text-center mb-8 px-4"
          >
            Please sign in to access your wallet and make purchases
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/pages/LoginScreen")}
            className="mb-4"
          >
            <View
              style={{ backgroundColor: colors.primary }}
              className="px-8 py-5 rounded-2xl"
            >
              <Text className="text-white font-bold text-lg text-center">
                Sign In
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* USDC Faucet Modal */}
      {showFaucetModal && (
        <Modal
          visible={showFaucetModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFaucetModal(false)}
        >
          <View className="flex-1 bg-black/70 justify-center items-center px-4">
            <View
              style={{ backgroundColor: colors.card }}
              className="w-full rounded-3xl p-6"
            >
              <View className="items-center mb-4">
                <View
                  className="w-16 h-16 rounded-full justify-center items-center mb-3"
                  style={{
                    backgroundColor: colors.primary + "20",
                  }}
                >
                  <Ionicons name="wallet" size={32} color={colors.primary} />
                </View>
              </View>

              <Text
                style={{ color: colors.text }}
                className="text-xl font-bold text-center mb-3"
              >
                Get Devnet USDC
              </Text>

              <Text
                style={{ color: colors.textSecondary }}
                className="text-base text-center"
              >
                Your wallet needs Devnet USDC to use the app features. You can
                either:
                {"\n"}
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-sm text-center mb-6"
              >
                Visit the SPL Token Faucet website
                {"\n"}
                or
                {"\n"}
                Request funding from the developer
                {"\n"}
                or
                {"\n"}
                Close this message and add funds later
              </Text>

              <View className="gap-3">
                <TouchableOpacity
                  onPress={async () => {
                    setShowFaucetModal(false);
                    await Linking.openURL(
                      "https://spl-token-faucet.com/?token-name=USDC-Dev"
                    );
                  }}
                  style={{ backgroundColor: colors.primary }}
                  className="w-full rounded-2xl py-4"
                >
                  <Text
                    style={{ color: "white" }}
                    className="text-center font-bold text-base"
                  >
                    Open Faucet Website
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    const mailtoUrl = `mailto:yahabubakar2504@gmail.com?subject=Devnet USDC Request&body=Please fund my wallet address with devnet USDC: ${walletAddress}`;
                    await Linking.openURL(mailtoUrl);
                    setShowFaucetModal(false);
                    showCustomAlert(
                      "Request Sent",
                      "Email request prepared. Please send the email and check back later."
                    );
                  }}
                  style={{ backgroundColor: colors.border }}
                  className="w-full rounded-2xl py-4"
                >
                  <Text
                    style={{ color: colors.text }}
                    className="text-center font-bold text-base"
                  >
                    Request from Developer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowFaucetModal(false)}
                  style={{ backgroundColor: "transparent" }}
                  className="w-full rounded-2xl py-4"
                >
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="text-center font-bold text-base"
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
        className="px-5 py-3 mb-4"
      >
        {/* User Profile Row */}
        <View className="flex-row items-center justify-between mb-1">
          <TouchableOpacity
            onPress={() => router.push("/pages/menu")}
            className="flex-row items-center flex-1"
            activeOpacity={0.7}
          >
            <View
              className="w-12 h-12 rounded-full justify-center items-center mr-4 overflow-hidden"
              style={{ backgroundColor: colors.primary + "10" }}
            >
              {userProfilePicture ? (
                <Image
                  source={{ uri: userProfilePicture }}
                  className="w-full h-full rounded-full"
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : (
                <Ionicons name="person" size={28} color={colors.primary} />
              )}
            </View>
            <View className="flex-1">
              <Text
                style={{ color: colors.textSecondary }}
                className="text-xs font-medium mb-0.5"
              >
                Welcome
              </Text>
              <Text
                style={{ color: colors.text }}
                className="text-xl font-bold"
                numberOfLines={1}
              >
                {userName || "User"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* other side  */}
          <View className="flex-row items-center gap-2">
            <View
              style={{ backgroundColor: colors.background }}
              className="px-3 py-2 rounded-xl "
            >
              <Text
                style={{ color: colors.text }}
                className="text-[8px] font-mono font-semibold"
              >
                {(() => {
                  const displayAddr = getDisplayAddress();
                  return `${displayAddr.slice(0, 6)}...${displayAddr.slice(-6)}`;
                })()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/pages/achievements")}
              style={{ backgroundColor: colors.background }}
              className="w-10 h-10 rounded-2xl justify-center items-center"
            >
              <Ionicons name="trophy" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Purchase Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View
            style={{ backgroundColor: colors.card }}
            className="w-full rounded-3xl p-8"
          >
            <TouchableOpacity
              className="absolute right-5 top-5 w-10 h-10 rounded-full justify-center items-center"
              style={{ backgroundColor: colors.border }}
              onPress={closeModal}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>

            <Text
              style={{ color: colors.text }}
              className="text-2xl font-normal text-center mb-8 mt-3"
            >
              Confirm Purchase
            </Text>

            {selectedDrink && (
              <>
                <View className="items-center mb-8 mt-8">
                  {/* <Image
                    source={selectedDrink.image}
                    className="w-56 h-40 rounded-2xl mb-3"
                    resizeMode="cover"
                  /> */}
                  <Text
                    style={{ color: colors.text }}
                    className="text-xl font-normal mb-1"
                  >
                    {selectedDrink.name}
                  </Text>
                  <View
                  // style={{ backgroundColor: colors.primary }}
                  // className="px-4 py-2 rounded-2xl mt-2"
                  >
                    <Text className="text-white text-3xl font-bold">
                      USDC {selectedDrink.price.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Only show wallet balance for embedded wallets */}
                {/* {walletType === "embedded" && (
                  <View
                    style={{ backgroundColor: colors.background }}
                    className="rounded-2xl p-4 mb-6"
                  >
                    <View className="flex-row justify-between items-center">
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="text-sm"
                      >
                        Wallet Balance
                      </Text>
                      <Text
                        style={{ color: colors.text }}
                        className="text-lg font-bold"
                      >
                        {tokenBalances?.usdc.toFixed(6) ?? "0.000000"}
                      </Text>
                    </View>
                  </View>
                )} */}

                {/* Payment buttons - both wallet types now use Solana Pay */}
                {/* Check actual USDC balance instead of old balance state */}
                {(tokenBalances?.usdc ?? 0) >= selectedDrink.price ? (
                  <View className="mb-4 mt-8">
                    <SliderButton
                      onSlideComplete={handlePayFromWallet}
                      title="Slide to Pay with Solana Pay"
                      icon={images.solana}
                      backgroundColor={colors.background}
                      sliderColor="#000"
                      textColor="#FFFFFF"
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{ backgroundColor: colors.border }}
                    className="w-full rounded-2xl py-5 mb-4"
                    onPress={() => {
                      closeModal();
                      handleAirdrop();
                    }}
                  >
                    <Text
                      style={{ color: colors.primary }}
                      className="text-center font-bold text-lg"
                    >
                      Top Up Wallet (Need{" "}
                      {(
                        selectedDrink.price - (tokenBalances?.usdc ?? 0)
                      ).toFixed(2)}{" "}
                      USDC)
                    </Text>
                  </TouchableOpacity>
                )}

                {/* <TouchableOpacity
                  style={{ backgroundColor: colors.border }}
                  className="w-full rounded-xl py-4"
                  onPress={closeModal}
                >
                  <Text
                    style={{ color: colors.text }}
                    className="text-center font-semibold text-base"
                  >
                    Pay with Card
                  </Text>
                </TouchableOpacity> */}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Transaction Progress Modal */}
      <Modal
        visible={showProgressModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View className="flex-1 bg-black/80 justify-center items-center px-4">
          <View
            style={{ backgroundColor: colors.card }}
            className="w-full rounded-3xl p-8"
          >
            <View className="items-center">
              {/* Progress Indicator */}
              <View
                className="w-20 h-20 rounded-full justify-center items-center mb-6"
                style={{ backgroundColor: colors.primary + "20" }}
              >
                <ActivityIndicator size="large" color={colors.primary} />
              </View>

              {/* Title */}
              <Text
                style={{ color: colors.text }}
                className="text-2xl font-bold text-center mb-3"
              >
                Processing Payment
              </Text>

              {/* Progress Message */}
              <Text
                style={{ color: colors.textSecondary }}
                className="text-base text-center mb-6"
              >
                {progressMessage}
              </Text>

              {/* Progress Steps */}
              <View className="w-full">
                {[
                  { step: 1, label: "Preparing payment" },
                  { step: 2, label: "Creating order" },
                  { step: 3, label: "Building transaction" },
                  { step: 4, label: "Requesting signature" },
                  { step: 5, label: "Sending to blockchain" },
                  { step: 6, label: "Confirming payment" },
                  { step: 7, label: "Complete" },
                ].map((item) => (
                  <View key={item.step} className="flex-row items-center mb-2">
                    <View
                      className="w-6 h-6 rounded-full justify-center items-center mr-3"
                      style={{
                        backgroundColor:
                          progressStep >= item.step
                            ? colors.primary
                            : colors.border,
                      }}
                    >
                      {progressStep > item.step ? (
                        <Ionicons name="checkmark" size={16} color="white" />
                      ) : progressStep === item.step ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text
                          style={{
                            color:
                              progressStep >= item.step
                                ? "white"
                                : colors.textSecondary,
                          }}
                          className="text-xs font-bold"
                        >
                          {item.step}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        color:
                          progressStep >= item.step
                            ? colors.text
                            : colors.textSecondary,
                      }}
                      className={`text-sm ${
                        progressStep >= item.step ? "font-semibold" : ""
                      }`}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Info Text */}
              <View
                style={{ backgroundColor: colors.background }}
                className="mt-6 p-4 rounded-2xl"
              >
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-xs text-center"
                >
                  Please don't close the app during the transaction
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        visible={showAlertModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-4 pb-4">
          <View
            style={{ backgroundColor: colors.card }}
            className="w-full rounded-3xl p-6"
          >
            {/* Icon */}
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-full justify-center items-center mb-3"
                style={{
                  backgroundColor:
                    alertTitle.includes("Success") ||
                    alertTitle.includes("Successful")
                      ? "#10B981" + "20"
                      : alertTitle.includes("Error") ||
                          alertTitle.includes("Failed")
                        ? "#EF4444" + "20"
                        : colors.primary + "20",
                }}
              >
                <Ionicons
                  name={
                    alertTitle.includes("Success") ||
                    alertTitle.includes("Successful")
                      ? "checkmark-circle"
                      : alertTitle.includes("Error") ||
                          alertTitle.includes("Failed")
                        ? "close-circle"
                        : "information-circle"
                  }
                  size={40}
                  color={
                    alertTitle.includes("Success") ||
                    alertTitle.includes("Successful")
                      ? "#10B981"
                      : alertTitle.includes("Error") ||
                          alertTitle.includes("Failed")
                        ? "#EF4444"
                        : colors.primary
                  }
                />
              </View>
            </View>

            {/* Title */}
            <Text
              style={{ color: colors.text }}
              className="text-xl font-bold text-center mb-3"
            >
              {alertTitle}
            </Text>

            {/* Message */}
            <Text
              style={{ color: colors.textSecondary }}
              className="text-base text-center mb-6"
            >
              {alertMessage}
            </Text>

            {/* OTP Display - Formatted Digit Boxes */}
            {alertOtp && (
              <View className="mb-6">
                <Text
                  style={{ color: colors.text }}
                  className="text-sm font-semibold text-center mb-3"
                >
                  Your One Time Password
                </Text>
                <View className="flex-row justify-center items-center gap-3">
                  {alertOtp.split("").map((digit, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: colors.background,
                        borderColor: colors.primary,
                      }}
                      className="w-20 h-20 rounded-2xl border-2 justify-center items-center"
                    >
                      <Text
                        style={{ color: colors.text }}
                        className="text-3xl font-bold"
                      >
                        {digit}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Buttons */}
            <View className="gap-3">
              {alertButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    if (button.onPress) {
                      button.onPress();
                    } else {
                      setShowAlertModal(false);
                    }
                  }}
                  style={{
                    backgroundColor:
                      button.style === "cancel"
                        ? colors.border
                        : colors.primary,
                  }}
                  className="w-full rounded-2xl py-4"
                >
                  <Text
                    style={{
                      color: button.style === "cancel" ? colors.text : "white",
                    }}
                    className="text-center font-bold text-base"
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        className="flex-1"
      >
        {/* Wallet Balance Card */}
        <View className="mx-4 mt-4">
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 2,
            }}
            className="rounded-3xl p-6"
          >
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <View
                  className="w-12 h-12 rounded-2xl justify-center items-center mr-3"
                  style={{ backgroundColor: colors.primary + "15" }}
                >
                  <Ionicons name="wallet" size={24} color={"#7680BC"} />
                </View>
                <Text
                  style={{ color: colors.text }}
                  className="text-lg font-bold"
                >
                  Wallet Balance
                </Text>
              </View>
              <View className="flex-row gap-2">
                {/* Top Up Button - Only for embedded wallets */}
                {/* {walletType === "embedded" && ( */}
                <TouchableOpacity
                  className="w-12 h-12 rounded-2xl justify-center items-center"
                  style={{
                    backgroundColor: colors.primary,
                    opacity: isLoadingBalances ? 0.5 : 1,
                  }}
                  disabled={isLoadingBalances}
                  onPress={() => !isLoadingBalances && handleAirdrop()}
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
                {/* )} */}
                {/* Refresh Button */}
                <TouchableOpacity
                  className="w-12 h-12 rounded-2xl justify-center items-center"
                  style={{ backgroundColor: colors.background }}
                  onPress={fetchTokenBalances}
                  disabled={isLoadingBalances}
                >
                  <Ionicons
                    name="refresh"
                    size={22}
                    color={colors.text}
                    style={isLoadingBalances ? { opacity: 0.5 } : {}}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Show USDC and SOL for all wallets */}
            {isLoadingBalances && !tokenBalances ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-sm mt-2"
                >
                  Loading balance...
                </Text>
              </View>
            ) : tokenBalances ? (
              <>
                <View className="">
                  <Text
                    style={{ color: colors.text }}
                    className="text-5xl font-bold mb-4"
                  >
                    {tokenBalances.usdc.toFixed(2)} USDC
                  </Text>
                </View>

                {balanceError && (
                  <View
                    style={{ backgroundColor: "#EF4444" + "20" }}
                    className="px-3 py-2 rounded-lg mb-3"
                  >
                    <Text
                      style={{ color: "#EF4444" }}
                      className="text-xs text-center font-medium"
                    >
                      ⚠️ {balanceError}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View className="py-4">
                <Text
                  style={{ color: colors.text }}
                  className="text-3xl font-bold mb-1"
                >
                  --
                </Text>
                {balanceError ? (
                  <View
                    style={{ backgroundColor: "#EF4444" + "20" }}
                    className="px-3 py-2 rounded-lg mb-3"
                  >
                    <Text
                      style={{ color: "#EF4444" }}
                      className="text-xs text-center font-medium"
                    >
                      ⚠️ {balanceError}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="text-sm"
                  >
                    Unable to load balances
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Select a Drink */}
        <View className="mt-6 mb-8">
          <View className="mx-4 mb-4">
            <Text style={{ color: colors.text }} className="text-xl font-bold">
              Available Drinks
            </Text>
            {/* <Text
              style={{ color: colors.textSecondary }}
              className="text-xs mt-1"
            >
              Choose your favorite beverage
            </Text> */}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 16 }}
            className="flex-row"
          >
            {drinks.map((drink, index) => (
              <TouchableOpacity
                key={drink.id}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  width: 280,
                  marginRight: index === drinks.length - 1 ? 0 : 12,
                }}
                className="rounded-2xl overflow-hidden"
                activeOpacity={0.7}
                onPress={() => handleDrinkSelect(drink)}
              >
                <View className="relative">
                  <Image
                    source={drink.image}
                    style={{ width: 280, height: 180 }}
                    resizeMode="cover"
                  />
                </View>
                <View className="p-4">
                  <Text
                    style={{ color: colors.text }}
                    className="font-bold text-base mb-3"
                    numberOfLines={1}
                  >
                    {drink.name}
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="text-xs mb-1"
                      >
                        Price
                      </Text>
                      <View className="flex-row items-baseline">
                        <Text
                          style={{ color: colors.text }}
                          className="text-lg font-bold"
                        >
                          {drink.price}
                        </Text>
                        <Text
                          style={{ color: colors.textSecondary }}
                          className="text-xs ml-1 font-medium"
                        >
                          USDC
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      className="w-11 h-11 rounded-xl justify-center items-center"
                      style={{
                        backgroundColor: colors.primary,
                        opacity: isLoadingBalances ? 0.5 : 1,
                      }}
                      disabled={isLoadingBalances}
                      onPress={() =>
                        !isLoadingBalances && handleDrinkSelect(drink)
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Transactions */}
        <View className="mx-4 mt-3">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text
                style={{ color: colors.text }}
                className="text-xl font-bold"
              >
                Recent Transactions
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-xs mt-1"
              >
                Track your recent activity
              </Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => router.push("../pages/transactions")}
            >
              <Text
                style={{ color: colors.primary }}
                className="font-semibold mr-1"
              >
                View All
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {transactions.length > 0 ? (
            transactions.slice(0, 3).map(renderTransactionItem)
          ) : (
            <View
              style={{ backgroundColor: colors.card }}
              className="rounded-2xl p-8"
            >
              <View className="items-center">
                <View
                  style={{ backgroundColor: colors.border }}
                  className="w-16 h-16 rounded-full justify-center items-center mb-3"
                >
                  <Ionicons
                    name="receipt-outline"
                    size={32}
                    color={colors.textSecondary}
                  />
                </View>
                <Text
                  style={{ color: colors.text }}
                  className="font-semibold mb-1"
                >
                  No Transactions Yet
                </Text>
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-center text-sm"
                >
                  Your recent transactions will appear here
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottle Progress Modal */}
      {showBottleProgressModal && (
        <Modal
          visible={showBottleProgressModal}
          transparent
          animationType="fade"
          statusBarTranslucent={true}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
              elevation: 9999,
            }}
          >
            <BottleProgressModal
              visible={showBottleProgressModal}
              progress={purchaseProgress}
              onClose={() => setShowBottleProgressModal(false)}
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
