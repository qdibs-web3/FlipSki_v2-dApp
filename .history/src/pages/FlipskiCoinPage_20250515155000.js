import React from 'react';
import '../styles/FlipskiCoinPage.css';
import Chad from '../components/Chad'; // Import the Chad component
import MarketCapProgress from '../components/MarketCapProgress'; // Import the MarketCapProgress component

const FlipskiCoinPage = () => {
  return (
    <div className="flipski-coin-page-container">
      <div className="main-container">
        <h1 className="main-container-title">Flipski Coin Details</h1>
        
        {/* Market Cap Progress Bar Feature */}
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
            {/* Whale Watcher feature */}
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
