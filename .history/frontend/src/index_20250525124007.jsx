// src/index.jsx - UPDATED VERSION
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { WalletProvider } from './context/WalletProvider';
import { metamaskWallet } from "@thirdweb-dev/react";
import { baseSepoliaChain } from './config'; // Import your chain definition
import App from './App';
import './styles/index.css';

// Ensure client ID is properly accessed
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThirdwebProvider 
      clientId={clientId}
      activeChain={baseSepoliaChain} // Use the imported chain object directly
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
