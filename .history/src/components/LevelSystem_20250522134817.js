import React, { useState, useEffect } from 'react';
import '../styles/LevelSystem.css';

const LevelSystem = ({ walletAddress, gameResult }) => {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [nextLevelXp, setNextLevelXp] = useState(10);
  const [prevLevelXp, setPrevLevelXp] = useState(0);
  const [progress, setProgress] = useState(0);
  const [processedGameIds, setProcessedGameIds] = useState([]);

  // Calculate total XP needed to reach a specific level
  const calculateTotalXpForLevel = (level) => {
    if (level <= 1) return 0;
    return (level - 1) * 10; // Simple linear progression: 10 XP per level
  };

  // Calculate level based on total XP
  const calculateLevelFromXp = (totalXp) => {
    if (totalXp < 10) return 1;
    
    // Simple formula: level = floor(XP/10) + 1, capped at 100
    const calculatedLevel = Math.floor(totalXp / 10) + 1;
    return Math.min(calculatedLevel, 100);
  };

  // Load data from localStorage
  const loadDataFromStorage = () => {
    if (!walletAddress) return;
    
    try {
      // Load XP data
      const storedXp = localStorage.getItem(`flipski_xp_${walletAddress.toLowerCase()}`);
      if (storedXp) {
        const parsedXp = parseInt(storedXp, 10);
        console.log(`Loaded XP for wallet ${walletAddress}: ${parsedXp}`);
        
        // Calculate level info
        const calculatedLevel = calculateLevelFromXp(parsedXp);
        const prevXp = calculateTotalXpForLevel(calculatedLevel);
        const nextXp = calculateTotalXpForLevel(calculatedLevel + 1);
        
        // Calculate progress percentage
        const levelXpRange = nextXp - prevXp;
        const currentLevelProgress = parsedXp - prevXp;
        const progressPercentage = Math.min(Math.max((currentLevelProgress / levelXpRange) * 100, 0), 100);
        
        // Update all state at once to prevent partial updates
        setXp(parsedXp);
        setLevel(calculatedLevel);
        setPrevLevelXp(prevXp);
        setNextLevelXp(nextXp);
        setProgress(progressPercentage > 0 ? progressPercentage : 1); // Ensure at least 1% for visibility
      }
      
      // Load processed game IDs
      const storedProcessedGameIds = localStorage.getItem(`flipski_processed_games_${walletAddress.toLowerCase()}`);
      if (storedProcessedGameIds) {
        const parsedIds = JSON.parse(storedProcessedGameIds);
        setProcessedGameIds(parsedIds);
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
    }
  };

  // Load data when wallet address changes
  useEffect(() => {
    loadDataFromStorage();
  }, [walletAddress]);

  // Process new game results
  useEffect(() => {
    if (!walletAddress || !gameResult || !gameResult.gameId) return;
    
    // Skip if already processed
    if (processedGameIds.includes(gameResult.gameId)) {
      return;
    }
    
    try {
      console.log(`Processing new game result for ${walletAddress}: ${gameResult.gameId}`);
      
      // Add XP based on game result
      const xpToAdd = gameResult.won ? 2 : 1;
      const newTotalXp = xp + xpToAdd;
      
      // Update processed games list
      const newProcessedGameIds = [...processedGameIds, gameResult.gameId];
      
      // Calculate new level info
      const newLevel = calculateLevelFromXp(newTotalXp);
      const newPrevXp = calculateTotalXpForLevel(newLevel);
      const newNextXp = calculateTotalXpForLevel(newLevel + 1);
      
      // Calculate new progress
      const newLevelXpRange = newNextXp - newPrevXp;
      const newCurrentLevelProgress = newTotalXp - newPrevXp;
      const newProgressPercentage = Math.min(Math.max((newCurrentLevelProgress / newLevelXpRange) * 100, 0), 100);
      
      // Save to localStorage first to ensure persistence
      localStorage.setItem(`flipski_xp_${walletAddress.toLowerCase()}`, newTotalXp.toString());
      localStorage.setItem(`flipski_processed_games_${walletAddress.toLowerCase()}`, JSON.stringify(newProcessedGameIds));
      
      // Then update state
      setXp(newTotalXp);
      setLevel(newLevel);
      setPrevLevelXp(newPrevXp);
      setNextLevelXp(newNextXp);
      setProgress(newProgressPercentage > 0 ? newProgressPercentage : 1); // Ensure at least 1% for visibility
      setProcessedGameIds(newProcessedGameIds);
      
      console.log(`Added ${xpToAdd} XP for ${walletAddress}. New total: ${newTotalXp}, Level: ${newLevel}, Progress: ${newProgressPercentage}%`);
    } catch (error) {
      console.error("Error processing game result:", error);
    }
  }, [walletAddress, gameResult, xp, processedGameIds]);

  // Debug button to manually clear data (can be removed in production)
  const debugClearData = () => {
    if (walletAddress) {
      localStorage.removeItem(`flipski_xp_${walletAddress.toLowerCase()}`);
      localStorage.removeItem(`flipski_processed_games_${walletAddress.toLowerCase()}`);
      setXp(0);
      setLevel(1);
      setPrevLevelXp(0);
      setNextLevelXp(10);
      setProgress(0);
      setProcessedGameIds([]);
      console.log(`Cleared data for wallet ${walletAddress}`);
    }
  };

  return (
    <div className="level-system">
      <p className="level-title">Level: {level}</p>
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-labels">
          <span className="progress-label">{level}</span>
          <span className="progress-label">{level < 100 ? level + 1 : 'MAX'}</span>
        </div>
      </div>
      <p className="xp-info">XP: {xp} / {nextLevelXp}</p>
      {/* Uncomment for debugging
      <button onClick={debugClearData} style={{fontSize: '10px', padding: '2px', marginTop: '2px'}}>
        Reset XP
      </button>
      */}
    </div>
  );
};

export default LevelSystem;
