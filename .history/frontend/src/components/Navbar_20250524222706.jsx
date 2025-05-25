// src/components/Navbar.js
import React from 'react';
import { ConnectWallet } from "@thirdweb-dev/react"; // Import the ConnectWallet component
import ErrorBoundary from './ErrorBoundary'; // Import the ErrorBoundary component
import '../styles/Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <h1 className="logo" onClick={() => window.location.href = '/'}>FLIPSKI</h1>
      <div className="wallet-section">
        <ErrorBoundary>
          <ConnectWallet
            theme="dark" // You can choose "light" or "dark"
            btnTitle="Connect Wallet"
            modalSize="compact" // You can choose "compact" or "wide"
          />
        </ErrorBoundary>
      </div>
    </nav>
  );
};

export default Navbar;
