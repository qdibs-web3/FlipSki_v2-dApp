// src/context/WalletProvider.js
import React, { createContext, useContext, useState } from "react";

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
  activeWalletInstance: null, // Added for the actual wallet instance
});

export const WalletProvider = ({ children }) => {
  const address = useAddress();
  // Destructure activeWallet and error from useConnect
  const { connect, isConnecting, activeWallet: thirdwebActiveWallet, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const connectionStatus = useConnectionStatus();
  // isLoading and error from useUser are specific to thirdweb auth/user features
  const { isLoading: isLoadingUser, error: errorUser } = useUser(); 
  const [isConnectActionLoading, setIsConnectActionLoading] = useState(false);

  // Combine potential errors
  const userRelatedError = errorUser || connectError;
  // Combine loading states for a general "connecting" indicator if needed by UI
  const overallIsConnecting = isConnecting || isConnectActionLoading;

  const connectWallet = async () => {
    setIsConnectActionLoading(true);
    try {
      await connect(metamaskWallet());
      // thirdwebActiveWallet from useConnect will update automatically
    } catch (err) {
      // connectError from useConnect should capture this, logging for good measure
      console.error("Error during connect wallet action:", err);
    } finally {
      setIsConnectActionLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
      // thirdwebActiveWallet from useConnect will update to undefined automatically
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
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
        isConnected: connectionStatus === "connected" && !!thirdwebActiveWallet,
        userRelatedIsLoading: isLoadingUser, // Specifically from useUser
        userRelatedError,
        activeWalletInstance: thirdwebActiveWallet || null, // Provide the active wallet instance
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

