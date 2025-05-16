import React, { useState, useEffect } from "react";
import "../styles/MarketCapProgress.css";
import milestone1Icon from '../assets/flip.png'; // Using existing logo as placeholder
import milestone2Icon from '../assets/ski.png';
import milestone3Icon from '../assets/flip.png';

function MarketCapProgress() {
    const [marketCap, setMarketCap] = useState(0);

    useEffect(() => {
        const fetchMarketCap = async () => {
            try {
                // Fetch market cap data for the specific contract address
                const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/0xbfDc9e893503903a63a6EfD5354D7BE77bbf1Ff2` );
                const data = await response.json();

                // Get the market cap value from the response
                const marketCapValue = data?.pairs[0]?.marketCap || 0; // Use 0 if no data is found
                setMarketCap(marketCapValue);
            } catch (error) {
                console.error("Error fetching market cap:", error);
            }
        };

        fetchMarketCap();
    }, []);

    const milestones = [
        { label: "FLIPSKI", value: 100000, icon: milestone1Icon },
        { label: "$FLIPSKI BETS", value: 750000, icon: milestone2Icon },
        { label: "MC Goal 3", value: 1250000, icon: milestone1Icon },
        { label: "FLIPSKI Evolved", value: 1800000, icon: milestone2Icon }
    ];

    return (
        <div className="gems-container3">
            <div className="header-container">
                <h1 className="header">Marketcap Goals</h1>
            </div>
            
            <div className="progress-bar-container">
                <div
                    className="progress-bar"
                    style={{
                        width: `${(marketCap / 2000000) * 100}%`, // Dynamically fill the progress bar
                    }}
                >
                    {milestones.map((milestone, index) => (
                        <div
                            key={index}
                            className="milestone"
                            style={{ left: `${(milestone.value / 2000000) * 100}%` }}
                        >
                            <img
                                className="milestone-icon"
                                src={milestone.icon}
                                alt={`Milestone ${index + 1}`}
                            />
                            <div
                                className={`milestone-label ${
                                    index % 2 === 0 ? "above" : "below"
                                }`}
                            >
                                <h3>{milestone.label}</h3>
                                <p>${milestone.value.toLocaleString()}</p>
                            </div>
                            <div
                                className={`milestone-line ${
                                    index % 2 === 0 ? "line-above" : "line-below"
                                }`}
                            ></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="current-marketcap-container">
                <p className="current-marketcap">Current Market Cap: ${marketCap.toLocaleString()}</p>
            </div>
        </div>
    );
}

export default MarketCapProgress;
