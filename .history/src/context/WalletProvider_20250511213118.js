// src/context/WalletProvider.js
import React, { createContext, useContext } from "react";
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
});

export const WalletProvider = ({ children }) => {
  const address = useAddress();
  const { connect, isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const connectionStatus = useConnectionStatus();
  const { isLoading: userRelatedIsLoading, error: userRelatedError } = useUser();
  const [isWalletLoading, setIsWalletLoading] = useState(false);


  const connectWallet = async () => {
    setIsWalletLoading(true);
    try {
      await connect(metamaskWallet());
    } catch (err) {
      console.error("Error connecting wallet:", err);
    } finally {
      setIsWalletLoading(false);
    }
  };
  

  const disconnectWallet = async () => {
    try {
      await disconnect();
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
        isConnecting,
        isConnected: connectionStatus === "connected",
        userRelatedIsLoading,
        userRelatedError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
