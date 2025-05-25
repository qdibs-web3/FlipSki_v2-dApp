// src/context/WalletProvider.js
import React, { createContext, useContext, useState, useEffect } from "react";

import {
  useConnect,
  useDisconnect,
  useAddress,
  useUser,
  useConnectionStatus,
  metamaskWallet,
  useSigner,
} from "@thirdweb-dev/react";

// Remove SSR safety check
// const isBrowser = typeof window !== 'undefined';

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
  const { connect, isConnecting: sdkIsConnecting, error: connectError } = useConnect(); 
  const { disconnect } = useDisconnect();
  const connectionStatus = useConnectionStatus();
  const signer = useSigner();
  const { isLoading: isLoadingUser, error: errorUser } = useUser(); 
  const [isConnectActionLoading, setIsConnectActionLoading] = useState(false);

  const userRelatedError = errorUser || connectError;
  const overallIsConnecting = sdkIsConnecting || isConnectActionLoading;
  const calculatedIsConnected = connectionStatus === "connected" || !!address;

  // Add environment logging for debugging without SSR check
  useEffect(() => {
    console.log("Environment:", {
      isProd: import.meta.env?.PROD || false,
      isBrowser: true,
      hasEthereum: !!window.ethereum,
    });
  }, []);

  useEffect(() => {
    console.log("WalletProvider Connection Debug:", {
      walletAddress: address,
      isConnected: calculatedIsConnected,
      signer: !!signer,
      connectionStatus,
    });
  }, [address, connectionStatus, signer, calculatedIsConnected]);
  

  const connectWallet = async () => {
    // Remove SSR check
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
    // Remove SSR check
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
        activeWalletInstance: signer || null,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
