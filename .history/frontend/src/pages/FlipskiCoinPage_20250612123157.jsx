import React, { useState, useEffect } from 'react';
import '../styles/FlipskiCoinPage.css';
import Chad from '../components/Chad';
import MarketCapProgress from '../components/MarketCapProgress';
import X from "../assets/x.png";
import tg from "../assets/tg.png";
import gif from "../assets/flipski4.gif";
import clank from "../assets/clank.png";

const FlipskiCoinPage = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('0xE4b2F8B5B9497222093e2B1Afb98CE2728D3bB07');
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
          <h1 className="main-container-title">BASE $FLIPSKI</h1>
          <div className="icon-buttons">
            <a href="https://www.clanker.world/clanker/0xE4b2F8B5B9497222093e2B1Afb98CE2728D3bB07" target="_blank" rel="noopener noreferrer">
              <img src={clank} alt="Link 1" className="icon-button" />
            </a>
            <a href="https://x.com/flipskionbase" target="_blank" rel="noopener noreferrer">
              <img src={X} alt="Link 2" className="icon-button" />
            </a>
            <a href="https://farcaster.xyz/~/channel/flipski" target="_blank" rel="noopener noreferrer">
              <img src={tg} alt="Link 3" className="icon-button" />
            </a>
          </div>
        </div>

        <div className="address-container">
            <span className="copyable-address" onClick={handleCopy}>
                {copied ? "Copied" : "0xE4b2F8B5B9497222093e2B1Afb98CE2728D3bB07"}
            </span>
        </div>

        <MarketCapProgress />

        <div className="grid-container">
        <div className="grid-item">
          <h2 className="grid-item-title">About $FLIPSKI</h2>
            <ul className="grid-item-list">
                <li>Flipski is a degen-driven meme coin designed for fast flips and high vibes.</li>
                <li>$FLIPSKI was released on clanker.world, a fair token launch platform for all.</li>
                <li>Play FLIPSKI for fun, verifiably fair game play. The FLIPSKI game utilizes chainlinks VRF to make this verifiably fair functionality possible.</li>
                <img src={gif} alt="Link 2" className="grid1-button" />
            </ul>
            </div>
          <div className="grid-item">
            <h2 className="grid-item-title">Game Rules</h2>
            <ul className="grid-item-list">
                <li>Bet between 0.001 ETH (min) and 0.01 ETH (max)</li>
                <li>Choose "Flip" (heads) or "Ski" (tails)</li>
                <li>Coin flip outcome is 50/50 (equal probability for heads or tails)</li>
                <li>Win: Players receive their Wager + Winnings, minus a 10% fee on the winnings.</li>
                <li>Loss: Players lose their wager.</li>
            </ul>
            <h2 className="grid-item-title">Game Example</h2>
            <ul className="grid-item-list">
                <li>Win: Wager (0.01 ETH) + Winnings (0.01 ETH) = 0.02 ETH total before fees.</li>
                <li>Fee: 10% of the winnings (0.01 ETH) = 0.001 ETH.</li>
                <li>Net payout: 0.02 ETH – 0.001 ETH = 0.0190 ETH.</li>
                <li>Loss: 0 ETH returned.</li>
            </ul>           
            </div>
          <div className="grid-item">
            <h2 className="grid-item-title">Learn More</h2>
            <ul className="grid-item-list">
                <li>The game is a decentralized coin flip powered by a smart contract using Chainlink VRF for secure randomness.</li>
                <li>Players start a game by calling flip() with their guess (Heads or Tails) and a wager within defined limits.</li>
                <li>The contract ensures the player has no ongoing game and that the bet is valid.</li>
                <li>Game data is stored, and a randomness request is sent to Chainlink VRF.</li>
                <li>Chainlink VRF generates a verifiable random number and sends it back via fulfillRandomWords().</li>
                <li>The contract uses this number to determine if the result is Heads or Tails.</li>
                <li>If the guess matches the outcome, the player wins and receives their wager back plus a reward (minus fees).</li>
                <li>If the player loses, the contract retains the wager, and the game is ready for a new flip.</li>
            </ul>           
          </div>
          <div className="grid-item">
            <h2 className="grid-item-title">Whale Watcher</h2>
            <Chad />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipskiCoinPage;
