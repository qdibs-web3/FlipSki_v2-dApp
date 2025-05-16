import React, { useState, useEffect } from 'react';
import '../styles/FlipskiCoinPage.css';
import Chad from '../components/Chad';
import MarketCapProgress from '../components/MarketCapProgress';
import X from "../assets/x.png";
import tg from "../assets/tg.png";

const FlipskiCoinPage = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('0x349gdfd89eh9eht0eh09rth70rh7t07');
    setCopied(true);
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

<img src={logo} alt="FlipSki ETH" className="page-title" />


  return (
    <div className="flipski-coin-page-container">
      <div className="main-container">
        <div className="title-row">
          <h1 className="main-container-title">Flipski Coin Details</h1>
          <div className="icon-buttons">
            <a href="https://example1.com" target="_blank" rel="noopener noreferrer">
              <img src={x} alt="Link 1" className="icon-button" />
            </a>
            <a href="https://example2.com" target="_blank" rel="noopener noreferrer">
              <img src="./assets/tg.png" alt="Link 2" className="icon-button" />
            </a>
          </div>
        </div>

        <p className="copyable-address" onClick={handleCopy}>
          {copied ? 'Copied!' : 'CA: 0x349gdfd89eh9eht0eh09rth70rh7t07'}
        </p>

        <MarketCapProgress />

        <div className="grid-container">
          <div className="grid-item">
            <h2 className="grid-item-title">Placeholder Title 1</h2>
            <p>Placeholder text for section 1. This section will contain information about the Flipski coin.</p>
          </div>
          <div className="grid-item">
            <h2 className="grid-item-title">Placeholder Title 2</h2>
            <p>Placeholder text for section 2. More details about the coin's utility or tokenomics can go here.</p>
          </div>
          <div className="grid-item">
            <h2 className="grid-item-title">Whale Watcher</h2>
            <Chad />
          </div>
          <div className="grid-item">
            <h2 className="grid-item-title">Placeholder Title 4</h2>
            <p>Placeholder text for section 4. Additional resources or links related to the Flipski coin.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipskiCoinPage;
