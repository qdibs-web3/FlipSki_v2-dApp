import React, { useState, useEffect, useRef } from 'react';
import '../styles/LevelSystem.css';

const LevelSystem = ({ walletAddress, gameResult }) => {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [nextLevelXp, setNextLevelXp] = useState(10);
  const [prevLevelXp, setPrevLevelXp] = useState(0);
  const [progress, setProgress] = useState(0);
  const [processedGameIds, setProcessedGameIds] = useState([]);
  const [lastProcessedGameId, setLastProcessedGameId] = useState(null);
  const previousWalletRef = useRef(null);

  // Calculate XP needed for a given level
  const calculateXpForLevel = (level) => {
    if (level <= 1) return 0;
    return 10 * (level - 1);
  };

  // Calculate total XP needed to reach a specific level
  const calculateTotalXpForLevel = (level) => {
    if (level <= 1) return 0;
    return (level - 1) * (10 + 10 * (level - 1)) / 2;
  };

  // Calculate level based on total XP
  const calculateLevelFromXp = (totalXp) => {
    if (totalXp < 10) return 1;
    
    let currentLevel = 1;
    while (calculateTotalXpForLevel(currentLevel + 1) <= totalXp && currentLevel < 100) {
      currentLevel++;
    }
    
    return currentLevel;
  };

  // Update all level-related state based on XP
  const updateLevelInfo = (currentXp) => {
    const calculatedLevel = calculateLevelFromXp(currentXp);
    setLevel(calculatedLevel);
    
    const prevXp = calculateTotalXpForLevel(calculatedLevel);
    const nextXp = calculateTotalXpForLevel(calculatedLevel + 1);
    setPrevLevelXp(prevXp);
    setNextLevelXp(nextXp);
    
    const levelXpRange = nextXp - prevXp;
    const currentLevelProgress = currentXp - prevXp;
    const progressPercentage = levelXpRange > 0 ? (currentLevelProgress / levelXpRange) * 100 : 0;
    
    // Ensure progress is at least 1% when XP is earned to make the bar visible
    setProgress(currentXp > 0 && progressPercentage === 0 ? 1 : progressPercentage);
  };

  // Load XP from localStorage when wallet address changes
  useEffect(() => {
    if (!walletAddress) return;
    
    // Only reload data if wallet address has changed
    if (previousWalletRef.current !== walletAddress) {
      previousWalletRef.current = walletAddress;
      
      const storedXp = localStorage.getItem(`flipski_xp_${walletAddress.toLowerCase()}`);
      const storedProcessedGameIds = localStorage.getItem(`flipski_processed_games_${walletAddress.toLowerCase()}`);
      
      let parsedXp = 0;
      if (storedXp) {
        try {
          parsedXp = parseInt(storedXp, 10);
          setXp(parsedXp);
          updateLevelInfo(parsedXp);
        } catch (e) {
          console.error("Error parsing stored XP:", e);
          setXp(0);
          updateLevelInfo(0);
        }
      } else {
        // No stored XP for this wallet, reset to defaults
        setXp(0);
        updateLevelInfo(0);
      }
      
      if (storedProcessedGameIds) {
        try {
          const parsedIds = JSON.parse(storedProcessedGameIds);
          setProcessedGameIds(parsedIds);
          if (parsedIds.length > 0) {
            setLastProcessedGameId(parsedIds[parsedIds.length - 1]);
          }
        } catch (e) {
          console.error("Error parsing processed game IDs:", e);
          setProcessedGameIds([]);
        }
      } else {
        // No stored game IDs for this wallet
        setProcessedGameIds([]);
        setLastProcessedGameId(null);
      }
    }
  }, [walletAddress]);

  // Update XP when game results change
  useEffect(() => {
    if (!walletAddress || !gameResult || !gameResult.gameId) return;
    
    // Prevent processing the same game multiple times
    if (gameResult.gameId === lastProcessedGameId || processedGameIds.includes(gameResult.gameId)) {
      return;
    }
    
    console.log("Processing new game result:", gameResult.gameId);
    
    // Add XP based on game result (1 for loss, 2 for win)
    const xpToAdd = gameResult.won ? 2 : 1;
    const newTotalXp = xp + xpToAdd;
    
    // Update processed games list
    const newProcessedGameIds = [...processedGameIds, gameResult.gameId];
    setProcessedGameIds(newProcessedGameIds);
    setLastProcessedGameId(gameResult.gameId);
    
    // Save to localStorage
    localStorage.setItem(`flipski_processed_games_${walletAddress.toLowerCase()}`, JSON.stringify(newProcessedGameIds));
    localStorage.setItem(`flipski_xp_${walletAddress.toLowerCase()}`, newTotalXp.toString());
    
    // Update state
    setXp(newTotalXp);
    updateLevelInfo(newTotalXp);
    
    console.log(`Added ${xpToAdd} XP. New total: ${newTotalXp}`);
  }, [walletAddress, gameResult, xp, processedGameIds, lastProcessedGameId]);

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
    </div>
  );
};

export default LevelSystem;
