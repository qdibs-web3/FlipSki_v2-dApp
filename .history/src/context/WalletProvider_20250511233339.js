// src/context/WalletProvider.js
import React, { createContext, useContext, useState, useEffect } from "react"; // Added useEffect for logging

import {
  useConnect,
  useDisconnect,
  useAddress,
  useUser,
  useConnectionStatus,
  metamaskWallet,
} from "@thirdweb-dev/react";

const WalletContext = createContext({
  walletAddress: null,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  connectionStatus: "unknown",
  isConnecting: false,
  isConnected: false,
  userRelatedIsLoading: false,
  userRelatedError: null,
  activeWalletInstance: null,
});

export const WalletProvider = ({ children }) => {
  const address = useAddress();
  const { connect, isConnecting, activeWallet: thirdwebActiveWallet, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const connectionStatus = useConnectionStatus();
  const { isLoading: isLoadingUser, error: errorUser } = useUser(); 
  const [isConnectActionLoading, setIsConnectActionLoading] = useState(false);

  const userRelatedError = errorUser || connectError;
  const overallIsConnecting = isConnecting || isConnectActionLoading;
  const calculatedIsConnected = connectionStatus === "connected" && !!thirdwebActiveWallet;

  // Diagnostic Logging
  useEffect(() => {
    console.log("WalletProvider State Update:");
    console.log("  - address (from useAddress):", address);
    console.log("  - connectionStatus (from useConnectionStatus):", connectionStatus);
    console.log("  - thirdwebActiveWallet (from useConnect):", thirdwebActiveWallet);
    console.log("  - isConnecting (from useConnect):", isConnecting);
    console.log("  - isConnectActionLoading (local state):", isConnectActionLoading);
    console.log("  - overallIsConnecting (combined):", overallIsConnecting);
    console.log("  - calculatedIsConnected (logic):", calculatedIsConnected);
    if (thirdwebActiveWallet) {
      console.log("  - thirdwebActiveWallet details:", {
        provider: !!thirdwebActiveWallet.getProvider(),
        signer: !!thirdwebActiveWallet.getSigner(),
        // Add any other relevant properties you want to check
      });
    }
  }, [address, connectionStatus, thirdwebActiveWallet, isConnecting, isConnectActionLoading, overallIsConnecting, calculatedIsConnected]);

  const connectWallet = async () => {
    setIsConnectActionLoading(true);
    console.log("WalletProvider: connectWallet action started");
    try {
      await connect(metamaskWallet());
      console.log("WalletProvider: connect action completed");
    } catch (err) {
      console.error("WalletProvider: Error during connect wallet action:", err);
    } finally {
      setIsConnectActionLoading(false);
      console.log("WalletProvider: connectWallet action finished");
    }
  };

  const disconnectWallet = async () => {
    console.log("WalletProvider: disconnectWallet action started");
    try {
      await disconnect();
      console.log("WalletProvider: disconnect action completed");
    } catch (err) {
      console.error("WalletProvider: Error disconnecting wallet:", err);
    } finally {
      console.log("WalletProvider: disconnectWallet action finished");
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress: address || null,
        connectWallet,
        disconnectWallet,
        connectionStatus,
        isConnecting: overallIsConnecting,
        isConnected: calculatedIsConnected, // Use the logged variable
        userRelatedIsLoading: isLoadingUser,
        userRelatedError,
        activeWalletInstance: thirdwebActiveWallet || null,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

