 // src/context/WalletProvider.js
 import React, { createContext, useContext } from "react";
 import {
   useAddress,
   useConnect,
   useDisconnect,
   metamaskWallet,
   useUser,
   useConnectionStatus // Import useConnectionStatus
 } from "@thirdweb-dev/react";
 
 const WalletContext = createContext({
   walletAddress: null,
   connectWallet: async () => {},
   disconnectWallet: async () => {},
   connectionStatus: 'unknown',
   isConnecting: false,
   isConnected: false,
   userRelatedIsLoading: false, // Clarify source of isLoading
   userRelatedError: null,      // Clarify source of error
 });
 
 export const WalletProvider = ({ children }) => {
   const address = useAddress();
   const connectFunc = useConnect(); 
   const disconnectFunc = useDisconnect(); 
   const status = useConnectionStatus(); // 'unknown', 'connecting', 'connected', 'disconnected'
 
   const { isLoading: userIsLoading, error: userError } = useUser();
 
   const handleConnect = async () => {
     try {
       await connectFunc(metamaskWallet());
     } catch (err) {
       console.error("Error connecting via WalletProvider:", err);
     }
   };
 
   const handleDisconnect = async () => {
     try {
       await disconnectFunc();
     } catch (err) {
       console.error("Error disconnecting via WalletProvider:", err);
     }
   };
 
   return (
     <WalletContext.Provider
       value={{
         walletAddress: address || null,
         connectWallet: handleConnect,
         disconnectWallet: handleDisconnect,
         connectionStatus: status,
         isConnecting: status === 'connecting',
         isConnected: status === 'connected',
         userRelatedIsLoading: userIsLoading,
         userRelatedError: userError,
       }}
     >
       {children}
     </WalletContext.Provider>
   );
 };
 
 export const useWallet = () => useContext(WalletContext);
 
 