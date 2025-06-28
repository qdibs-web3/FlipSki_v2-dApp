// src/components/Footer.jsx
import React from 'react';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <span className="footer-credit">FLIPSKI 2025</span>
        <span className="footer-spacer"></span>
        <span className="footer-credit">
          Built by <a href="https://x.com/qdibs_eth" target="_blank" rel="noopener noreferrer">Qdibs</a>
        </span>
        <span className="footer-spacer"></span>
        <span className="footer-credit">v2.0.0</span>
      </div>
    </footer>
  );
};

export default Footer;
