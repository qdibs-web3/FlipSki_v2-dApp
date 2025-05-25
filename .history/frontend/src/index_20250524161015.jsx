import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './styles/index.css';

// Create a dynamic import for ThirdWeb components
const DynamicThirdwebProvider = () => {
  const [ThirdwebComponents, setThirdwebComponents] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadThirdwebComponents = async () => {
      try {
        // Dynamically import ThirdWeb components only on client side
        const { ThirdwebProvider, metamaskWallet } = await import('@thirdweb-dev/react');
        const { baseSepoliaChain } = await import('./config');
        
        setThirdwebComponents({
          ThirdwebProvider,
          metamaskWallet,
          baseSepoliaChain
        });
      } catch (err) {
        console.error("Failed to load ThirdWeb components:", err);
        setError("Failed to initialize wallet connection. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    // Only run in browser environment
    if (typeof window !== 'undefined') {
      loadThirdwebComponents();
    } else {
      setIsLoading(false);
    }
  }, []);

  if (typeof window === 'undefined') {
    // Server-side rendering - return app without ThirdWeb
    return (
      <Router>
        <App />
      </Router>
    );
  }

  if (isLoading) {
    // Loading state while ThirdWeb components are being imported
    return (
      <Router>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading wallet connection...</p>
        </div>
        <App />
      </Router>
    );
  }

  if (error || !ThirdwebComponents) {
    // Error state or failed to load ThirdWeb
    return (
      <Router>
        <div className="error-container">
          <p>{error || "Failed to initialize wallet connection."}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
        <App />
      </Router>
    );
  }

  // Successfully loaded ThirdWeb components
  const { ThirdwebProvider, metamaskWallet, baseSepoliaChain } = ThirdwebComponents;
  
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
      <Router>
        <App />
      </Router>
    </ThirdwebProvider>
  );
};

// Render the app with dynamic ThirdWeb loading
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DynamicThirdwebProvider />
  </React.StrictMode>
);
