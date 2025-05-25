// src/context/WalletProvider.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  useConnect,
  useDisconnect,
  useAddress,
  useUser,
  useConnectionStatus,
  metamaskWallet,
  useSigner,
} from "@thirdweb-dev/react";

// Improved SSR safety check
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
  activeWalletInstance: null,
});

export const WalletProvider = ({ children }) => {
  // Use refs to prevent undefined values during hydration
  const initializedRef = useRef(false);
  
  // Only use ThirdWeb hooks if in browser environment
  const address = isBrowser ? useAddress() : null;
  const { connect, isConnecting: sdkIsConnecting, error: connectError } = isBrowser ? useConnect() : { connect: async () => {}, isConnecting: false, error: null };
  const { disconnect } = isBrowser ? useDisconnect() : { disconnect: async () => {} };
  const connectionStatus = isBrowser ? useConnectionStatus() : "unknown";
  const signer = isBrowser ? useSigner() : null;
  const { isLoading: isLoadingUser, error: errorUser } = isBrowser ? useUser() : { isLoading: false, error: null };
  
  const [isConnectActionLoading, setIsConnectActionLoading] = useState(false);

  const userRelatedError = errorUser || connectError;
  const overallIsConnecting = sdkIsConnecting || isConnectActionLoading;
  const calculatedIsConnected = connectionStatus === "connected" || !!address;

  // Ensure initialization only happens once in browser
  useEffect(() => {
    if (isBrowser && !initializedRef.current) {
      initializedRef.current = true;
      console.log("Environment:", {
        isProd: import.meta.env?.PROD || false,
        isBrowser: true,
        hasEthereum: !!window.ethereum,
      });
    }
  }, []);

  // Add defensive logging
  useEffect(() => {
    if (isBrowser) {
      console.log("WalletProvider Connection Debug:", {
        walletAddress: address,
        isConnected: calculatedIsConnected,
        signer: !!signer,
        connectionStatus,
      });
    }
  }, [address, connectionStatus, signer, calculatedIsConnected]);

  const connectWallet = async () => {
    if (!isBrowser) return;
    
    setIsConnectActionLoading(true);
    try {
      await connect(metamaskWallet());
    } catch (err) {
      console.error("WalletProvider: Error during connect wallet action:", err);
    } finally {
      setIsConnectActionLoading(false);
    }
  };

  const disconnectWallet = async () => {
    if (!isBrowser) return;
    
    try {
      await disconnect();
    } catch (err) {
      console.error("WalletProvider: Error disconnecting wallet:", err);
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
