// src/index.jsx - COMPLETE OVERHAUL
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { BaseSepoliaTestnet } from "@thirdweb-dev/chains";
import { metamaskWallet } from "@thirdweb-dev/react";
import App from './App';
import './styles/index.css';

// Get client ID with fallback
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "";

// Create a simplified ThirdwebProvider setup
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThirdwebProvider 
      clientId={clientId}
      activeChain={BaseSepoliaTestnet}
      supportedWallets={[metamaskWallet()]}
    >
      <Router>
        <App />
      </Router>
    </ThirdwebProvider>
  </React.StrictMode>
);