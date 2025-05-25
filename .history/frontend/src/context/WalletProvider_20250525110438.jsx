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
  // Use ThirdWeb hooks directly without SSR checks
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

  // Add defensive logging
  useEffect(() => {
    console.log("WalletProvider Connection Debug:", {
      walletAddress: address,
      isConnected: calculatedIsConnected,
      signer: !!signer,
      connectionStatus,
    });
  }, [address, connectionStatus, signer, calculatedIsConnected]);

  const connectWallet = async () => {
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
