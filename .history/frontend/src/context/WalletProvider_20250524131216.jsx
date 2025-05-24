// src/context/WalletProvider.js
import React, { createContext, useContext, useState, useEffect } from "react";

import {
  useConnect,
  useDisconnect,
  useAddress,
  useUser,
  useConnectionStatus,
  metamaskWallet,
  useSigner, // Import useSigner
} from "@thirdweb-dev/react";

// Add SSR safety check
const isBrowser = typeof window !== 'undefined';

const WalletContext = createContext({
  walletAddress: null,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  connectionStatus: "unknown",
  isConnecting: false,
  isConnected: false,
  userRelatedIsLoading: false,
  userRelatedError: null,
  activeWalletInstance: null, // This will now be the signer object
});

export const WalletProvider = ({ children }) => {
  const address = useAddress();
  // Remove activeWallet from useConnect as it was undefined
  const { connect, isConnecting: sdkIsConnecting, error: connectError } = useConnect(); 
  const { disconnect } = useDisconnect();
  const connectionStatus = useConnectionStatus();
  const signer = useSigner(); // Get the signer instance
  const { isLoading: isLoadingUser, error: errorUser } = useUser(); 
  const [isConnectActionLoading, setIsConnectActionLoading] = useState(false);

  const userRelatedError = errorUser || connectError;
  const overallIsConnecting = sdkIsConnecting || isConnectActionLoading;
  // Update isConnected logic to use the presence of a signer
  const calculatedIsConnected = connectionStatus === "connected" && !!signer;

  // Add environment logging for debugging
  useEffect(() => {
    if (isBrowser) {
      console.log("Environment:", {
        isProd: import.meta.env?.PROD || false,
        isBrowser: true,
        hasEthereum: !!window.ethereum,
      });
    }
  }, []);

  useEffect(() => {
    if (!isBrowser) return; // Skip this effect during SSR
    
    console.log("WalletProvider State Update:");
    console.log("  - address (from useAddress):", address);
    console.log("  - connectionStatus (from useConnectionStatus):", connectionStatus);
    console.log("  - signer (from useSigner):", signer);
    console.log("  - sdkIsConnecting (from useConnect):", sdkIsConnecting);
    console.log("  - isConnectActionLoading (local state):", isConnectActionLoading);
    console.log("  - overallIsConnecting (combined):", overallIsConnecting);
    console.log("  - calculatedIsConnected (logic):", calculatedIsConnected);
    if (signer) {
      console.log("  - signer details:", {
        provider: !!signer.provider,
        // You can log other signer properties if needed
      });
    }
  }, [address, connectionStatus, signer, sdkIsConnecting, isConnectActionLoading, overallIsConnecting, calculatedIsConnected]);

  const connectWallet = async () => {
    if (!isBrowser) return; // Skip during SSR
    
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
    if (!isBrowser) return; // Skip during SSR
    
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
        isConnected: calculatedIsConnected,
        userRelatedIsLoading: isLoadingUser,
        userRelatedError,
        activeWalletInstance: signer || null, // Provide the signer as the active instance
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
