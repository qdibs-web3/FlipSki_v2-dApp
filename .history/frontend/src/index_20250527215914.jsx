// src/index.jsx - ALTERNATIVE SOLUTION
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { WalletProvider } from './context/WalletProvider';
import { metamaskWallet } from "@thirdweb-dev/react";
import { Base, BaseSepoliaTestnet } from "@thirdweb-dev/chains";
import App from './App';
import './styles/index.css';

// Ensure client ID is properly accessed
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThirdwebProvider 
      clientId={clientId}
      activeChain={BaseSepoliaTestnet}
      autoConnect={true}
    >
      <WalletProvider>
        <Router>
          <App />
        </Router>
      </WalletProvider>
    </ThirdwebProvider>
  </React.StrictMode>,
);
