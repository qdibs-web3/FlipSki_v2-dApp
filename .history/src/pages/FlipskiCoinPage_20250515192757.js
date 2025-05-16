import React, { useState, useEffect } from 'react';
import '../styles/FlipskiCoinPage.css';
import Chad from '../components/Chad';
import MarketCapProgress from '../components/MarketCapProgress';
import X from "../assets/x.png";
import tg from "../assets/tg.png";
import gif from "../assets/flipski.gif";

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

  return (
    <div className="flipski-coin-page-container">
      <div className="main-container">
        <div className="title-row">
          <h1 className="main-container-title">$FLIPSKI on Base</h1>
          <div className="icon-buttons">
            <a href="https://example1.com" target="_blank" rel="noopener noreferrer">
              <img src={X} alt="Link 1" className="icon-button" />
            </a>
            <a href="https://example2.com" target="_blank" rel="noopener noreferrer">
              <img src={tg} alt="Link 2" className="icon-button" />
            </a>
          </div>
        </div>

        <div className="address-container">
            <span className="copyable-address" onClick={handleCopy}>
                {copied ? "Copied" : "0x349gdfd89eh9eht0eh09rth70rh7t07"}
            </span>
        </div>

        <MarketCapProgress />

        <div className="grid-container">
        <div className="grid-item">
          <h2 className="grid-item-title">About $FLIPSKI</h2>
            <ul className="grid-item-list">
                <li>Flipski is a degen-driven meme coin designed for fast flips and high vibes.</li>
                <li>$FLIPSKI will be released on Cliza, a fair token launch platform.</li>
                <li>Play FLIPSKI for fun, verifiably fair game play. The FLIPSKI game utilizes chainlinks VRF to make this verifiably fair functionality possible.</li>
                <img src={gif} alt="Link 2" className="grid1-button" />
            </ul>
            </div>
          <div className="grid-item">
            <h2 className="grid-item-title">FLIPSKI Game Rules</h2>
            <ul className="grid-item-list">
                <li>Bet between 0.001 ETH (min) and 0.01 ETH (max)</li>
                <li>Choose "Flip" (heads) or "Ski" (tails)</li>
                <li>Coin flip outcome is 50/50 (equal probability for heads or tails)</li>
                <li>Win: Players receive their Wager + Winnings, minus a 5% fee on the winnings.</li>
                <li>Loss: Players lose their wager.</li>
            </ul>
            <h2 className="grid-item-title">Game Example</h2>
            <ul className="grid-item-list">
                <li>Players wager between 0.001 ETH (min) and 0.01 ETH (max).</li>
                <li>$FLIPSKI will be released on Cliza, a fair token launch platform.</li>
                <li>Play FLIPSKI for fun, verifiably fair game play. The FLIPSKI game utilizes chainlinks VRF to make this verifiably fair functionality possible.</li>
                <img src={gif} alt="Link 2" className="grid1-button" />
            </ul>           
            </div>
          <div className="grid-item">
            <h2 className="grid-item-title">Whale Watcher</h2>
            <Chad />
          </div>
          <div className="grid-item">
            <h2 className="grid-item-title">Learn More</h2>
            <p>Placeholder text for section 4. Additional resources or links related to the Flipski coin.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipskiCoinPage;
