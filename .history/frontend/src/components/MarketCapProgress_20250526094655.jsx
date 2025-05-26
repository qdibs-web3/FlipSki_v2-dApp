import React, { useState, useEffect } from "react";
import "../styles/MarketCapProgress.css";
import milestone1Icon from '../assets/flip1.png';
import milestone2Icon from '../assets/ski1.png';
import vrf from '../assets/vrf.png';

function MarketCapProgress() {
    const [marketCap, setMarketCap] = useState(0);
    const [showVRF, setShowVRF] = useState(false);

    useEffect(() => {
        const fetchMarketCap = async () => {
            try {
                const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/0xbfDc9e893503903a63a6EfD5354D7BE77bbf1Ff2`);
                const data = await response.json();
                const marketCapValue = data?.pairs[0]?.marketCap || 0;
                setMarketCap(marketCapValue);
            } catch (error) {
                console.error("Error fetching market cap:", error);
            }
        };

        fetchMarketCap();
    }, []);

    const milestones = [
        { label: "FLIPSKI", value: 100000, icon: milestone1Icon },
        { label: "Challenges", value: 500000, icon: milestone2Icon },
        { label: "??????", value: 1000000, icon: milestone1Icon },
        { label: "FLIPSKI Evolved", value: 1800000, icon: milestone2Icon }
    ];

    return (
        <div className="gems-container3">
            <div className="header-container">
                <h1 className="header">Marketcap Goals</h1>
            </div>

            {showVRF ? (
                <div className="vrf-container">
                    <img src={vrf} alt="VRF" className="vrf-image" />
                </div>
            ) : (
                <>
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar"
                            style={{
                                width: `${(marketCap / 2000000) * 100}%`,
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
                                    <div className={`milestone-label ${index % 2 === 0 ? "above" : "below"}`}>
                                        <h3>{milestone.label}</h3>
                                        <p>${milestone.value.toLocaleString()}</p>
                                    </div>
                                    <div className={`milestone-line ${index % 2 === 0 ? "line-above" : "line-below"}`}></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="marketcap-toggle-row">
                        <p className="current-marketcap">Current Market Cap: ${marketCap.toLocaleString()}</p>
                        <div className="inline-toggle">
                            <label className="switch">
                                <input type="checkbox" checked={showVRF} onChange={() => setShowVRF(!showVRF)} />
                                <span className="slider round"></span>
                            </label>
                            <span className="toggle-label">{showVRF ? "Show Goals" : "Show VRF"}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default MarketCapProgress;
