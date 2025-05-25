// src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThirdwebProvider, ChainId } from "@thirdweb-dev/react";
import { WalletProvider } from './context/WalletProvider';
import { metamaskWallet } from "@thirdweb-dev/react";
import App from './App';
import './styles/index.css';

// Ensure client ID is properly accessed
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "";

// Using a direct chain ID instead of importing baseSepoliaChain
const baseSepoliaChainId = ChainId.BaseSepoliaTestnet;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThirdwebProvider 
      clientId={clientId}
      activeChain={baseSepoliaChainId}
      supportedWallets={[metamaskWallet()]}
      autoConnect={false}
    >
      <WalletProvider>
        <Router>
          <App />
        </Router>
      </WalletProvider>
    </ThirdwebProvider>
  </React.StrictMode>,
);