import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { metamaskWallet } from "@thirdweb-dev/react";
import { baseSepoliaChain } from './config';
import App from './App';
import '../index.css';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThirdwebProvider 
      clientId={import.meta.env.REACT_APP_THIRDWEB_CLIENT_ID}
      supportedChains={[baseSepoliaChain]} 
      supportedWallets={[metamaskWallet()]}
      dAppMeta={{
        name: "FlipSki",
        description: "Flip a coin on the blockchain",
        logoUrl: "/logo.png",
        url: isBrowser ? window.location.origin : "",
      }}
      autoConnect={false} // Set to false to prevent auto-connection issues in SSR
      ssr={true} // Enable SSR mode
    >
      <Router>
        <App />
      </Router>
    </ThirdwebProvider>
  </React.StrictMode>,
);
