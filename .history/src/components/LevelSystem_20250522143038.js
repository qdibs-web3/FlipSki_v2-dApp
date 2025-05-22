import React, { useState, useEffect } from 'react';
import '../styles/LevelSystem.css';

const LevelSystem = ({ walletAddress, gameResult }) => {
  // State
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [nextLevelXp, setNextLevelXp] = useState(10);
  const [processedGameIds, setProcessedGameIds] = useState([]);
  
  // Load data when wallet connects
  useEffect(() => {
    if (!walletAddress) return;
    
    try {
      // Load player data from localStorage
      const savedXp = localStorage.getItem(`flipski_xp_${walletAddress.toLowerCase()}`);
      const savedGameIds = localStorage.getItem(`flipski_games_${walletAddress.toLowerCase()}`);
      
      if (savedXp) {
        const parsedXp = parseInt(savedXp, 10);
        setXp(parsedXp);
        
        // Calculate level
        const calculatedLevel = Math.min(Math.floor(parsedXp / 10) + 1, 100);
        setLevel(calculatedLevel);
        setNextLevelXp(calculatedLevel * 10);
      }
      
      if (savedGameIds) {
        try {
          setProcessedGameIds(JSON.parse(savedGameIds));
        } catch (e) {
          console.error("Error parsing game IDs:", e);
          setProcessedGameIds([]);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [walletAddress]);
  
  // Process game results
  useEffect(() => {
    if (!walletAddress || !gameResult || !gameResult.gameId) return;
    
    // Skip if already processed
    if (processedGameIds.includes(gameResult.gameId)) {
      return;
    }
    
    try {
      // Calculate XP to add
      const xpToAdd = gameResult.won ? 2 : 1;
      const newXp = xp + xpToAdd;
      
      // Update processed games
      const newProcessedGameIds = [...processedGameIds, gameResult.gameId];
      
      // Save to localStorage
      localStorage.setItem(`flipski_xp_${walletAddress.toLowerCase()}`, newXp.toString());
      localStorage.setItem(`flipski_games_${walletAddress.toLowerCase()}`, JSON.stringify(newProcessedGameIds));
      
      // Update state
      setXp(newXp);
      const newLevel = Math.min(Math.floor(newXp / 10) + 1, 100);
      setLevel(newLevel);
      setNextLevelXp(newLevel * 10);
      setProcessedGameIds(newProcessedGameIds);
    } catch (error) {
      console.error("Error processing game:", error);
    }
  }, [walletAddress, gameResult, xp, processedGameIds]);
  
  // Calculate progress percentage
  const progressPercentage = (() => {
    const levelStartXp = (level - 1) * 10;
    const xpInCurrentLevel = xp - levelStartXp;
    return Math.min(Math.max((xpInCurrentLevel / 10) * 100, 1), 100);
  })();
  
  // Reset data (for debugging)
  const resetData = () => {
    if (walletAddress) {
      localStorage.removeItem(`flipski_xp_${walletAddress.toLowerCase()}`);
      localStorage.removeItem(`flipski_games_${walletAddress.toLowerCase()}`);
      setXp(0);
      setLevel(1);
      setNextLevelXp(10);
      setProcessedGameIds([]);
    }
  };
  
  return (
    <div className="level-system" style={{ maxWidth: '560px' }}> {/* Doubled width from 280px to 560px */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <p className="level-title" style={{ margin: 0 }}>Level: {level}</p>
        <p className="xp-info" style={{ margin: 0 }}>XP: {xp} / {nextLevelXp}</p> {/* Moved next to Level */}
      </div>
      
      <div style={{ position: 'relative' }}>
        {/* Level labels above the progress bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <span style={{fontSize: '12px', color: '#ffffff'}}>{level}</span>
          <span style={{fontSize: '12px', color: '#ffffff'}}>{level < 100 ? level + 1 : 'MAX'}</span>
        </div>
        
        {/* Progress bar with inline styles */}
        <div style={{
          width: '100%',
          height: '10px',
          backgroundColor: '#333',
          borderRadius: '5px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: '#39ff14',
            borderRadius: '5px 0 0 5px',
            minWidth: '4px'
          }}></div>
        </div>
      </div>
      
      {/* Debug reset button */}
      <button onClick={resetData} style={{
        fontSize: '10px',
        padding: '2px',
        marginTop: '8px',
        backgroundColor: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer'
      }}>
        Reset XP
      </button>
    </div>
  );
};

export default LevelSystem;
