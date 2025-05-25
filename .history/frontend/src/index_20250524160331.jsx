import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { metamaskWallet } from "@thirdweb-dev/react";
import { baseSepoliaChain } from './config';
import App from './App';
import './styles/index.css';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a simple wrapper to conditionally render ThirdwebProvider only in browser
const SafeThirdwebProvider = ({ children }) => {
  // During SSR, render children without ThirdwebProvider
  if (!isBrowser) {
    return <>{children}</>;
  }

  // In browser, use ThirdwebProvider
  return (
    <ThirdwebProvider 
      activeChain={baseSepoliaChain}
      clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID || ""}
      supportedWallets={[metamaskWallet()]}
      dAppMeta={{
        name: "FlipSki",
        description: "Flip a coin on the blockchain",
        logoUrl: "/logo.png",
        url: window.location.origin,
      }}
      autoConnect={false}
    >
      {children}
    </ThirdwebProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SafeThirdwebProvider>
      <Router>
        <App />
      </Router>
    </SafeThirdwebProvider>
  </React.StrictMode>,
);
