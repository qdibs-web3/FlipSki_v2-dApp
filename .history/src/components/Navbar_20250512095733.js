// src/components/Navbar.js
import React from 'react';
import { ConnectWallet } from "@thirdweb-dev/react"; // Import the ConnectWallet component
import logo from '../assets/logo.png';
import '../styles/Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <img
        src={logo}
        alt="Logo"
        className="logo"
        onClick={() => window.location.href = '/'}
      />

      <div className="wallet-section">
        <ConnectWallet
          theme="dark" // You can choose "light" or "dark"
          btnTitle="Connect Wallet"
          modalSize="wide" // You can choose "compact" or "wide"
        />
      </div>
    </nav>
  );
};

export default Navbar;
