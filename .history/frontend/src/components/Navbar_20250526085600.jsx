// src/components/Navbar.jsx
import React from 'react';
import { ConnectWallet } from "@thirdweb-dev/react";
import { useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <nav className="navbar">
      <div className="dropdown">
        <button className="logo dropbtn">FLIPSKI</button>
        <div className="dropdown-content">
          <span onClick={() => handleNavigate('/')}>Home</span>
          <span onClick={() => handleNavigate('/flipski-coin')}>$FLIPSKI</span>
          <span onClick={() => handleNavigate('/coinflip')}>Play FLIPSKI</span>
        </div>
      </div>

      <div className="wallet-section">
        <ConnectWallet
          theme="dark"
          btnTitle="Connect Wallet"
          modalSize="compact"
        />
      </div>
    </nav>
  );
};

export default Navbar;
