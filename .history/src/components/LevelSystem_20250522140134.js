import React, { useState, useEffect } from 'react';
import '../styles/LevelSystem.css';

const LevelSystem = ({ walletAddress, gameResult }) => {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [nextLevelXp, setNextLevelXp] = useState(10);
  const [processedGameIds, setProcessedGameIds] = useState([]);

  // Calculate level based on XP
  const calculateLevel = (xpAmount) => {
    return Math.min(Math.floor(xpAmount / 10) + 1, 100);
  };

  // Calculate XP needed for next level
  const calculateNextLevelXp = (currentLevel) => {
    return currentLevel * 10;
  };

  // Calculate progress percentage
  const calculateProgress = (currentXp, currentLevel) => {
    const levelStartXp = (currentLevel - 1) * 10;
    const levelEndXp = currentLevel * 10;
    const xpInCurrentLevel = currentXp - levelStartXp;
    const xpNeededForLevel = levelEndXp - levelStartXp;
    return (xpInCurrentLevel / xpNeededForLevel) * 100;
  };

  // Load XP data when wallet changes
  useEffect(() => {
    if (!walletAddress) return;
    
    console.log(`Loading data for wallet: ${walletAddress}`);
    
    // Load XP
    const storedXp = localStorage.getItem(`flipski_xp_${walletAddress.toLowerCase()}`);
    if (storedXp) {
      const parsedXp = parseInt(storedXp, 10);
      console.log(`Loaded XP: ${parsedXp}`);
      setXp(parsedXp);
      
      // Calculate and set level
      const calculatedLevel = calculateLevel(parsedXp);
      setLevel(calculatedLevel);
      
      // Calculate and set next level XP
      setNextLevelXp(calculateNextLevelXp(calculatedLevel));
    } else {
      // Reset to defaults if no data found
      console.log('No XP data found, setting defaults');
      setXp(0);
      setLevel(1);
      setNextLevelXp(10);
    }
    
    // Load processed game IDs
    const storedGameIds = localStorage.getItem(`flipski_games_${walletAddress.toLowerCase()}`);
    if (storedGameIds) {
      try {
        setProcessedGameIds(JSON.parse(storedGameIds));
      } catch (e) {
        console.error('Error parsing stored game IDs:', e);
        setProcessedGameIds([]);
      }
    } else {
      setProcessedGameIds([]);
    }
  }, [walletAddress]);

  // Process game results
  useEffect(() => {
    if (!walletAddress || !gameResult || !gameResult.gameId) return;
    
    // Skip if already processed
    if (processedGameIds.includes(gameResult.gameId)) {
      console.log(`Game ${gameResult.gameId} already processed, skipping`);
      return;
    }
    
    console.log(`Processing game ${gameResult.gameId} for wallet ${walletAddress}`);
    
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
    setLevel(calculateLevel(newXp));
    setNextLevelXp(calculateNextLevelXp(calculateLevel(newXp)));
    setProcessedGameIds(newProcessedGameIds);
    
    console.log(`Added ${xpToAdd} XP. New total: ${newXp}`);
  }, [walletAddress, gameResult, xp, processedGameIds]);

  // For debugging - can be removed in production
  const resetData = () => {
    if (walletAddress) {
      localStorage.removeItem(`flipski_xp_${walletAddress.toLowerCase()}`);
      localStorage.removeItem(`flipski_games_${walletAddress.toLowerCase()}`);
      setXp(0);
      setLevel(1);
      setNextLevelXp(10);
      setProcessedGameIds([]);
      console.log(`Reset data for wallet ${walletAddress}`);
    }
  };

  // Calculate progress percentage for the current level
  const progressPercentage = calculateProgress(xp, level);

  return (
    <div className="level-system">
      <p className="level-title">Level: {level}</p>
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="progress-labels">
          <span className="progress-label">{level}</span>
          <span className="progress-label">{level < 100 ? level + 1 : 'MAX'}</span>
        </div>
      </div>
      <p className="xp-info">XP: {xp} / {nextLevelXp}</p>
      {/* Uncomment for debugging
      <button onClick={resetData} style={{fontSize: '10px', padding: '2px', marginTop: '2px'}}>
        Reset XP
      </button>
      */}
    </div>
  );
};

export default LevelSystem;
