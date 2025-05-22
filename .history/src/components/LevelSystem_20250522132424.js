import React, { useState, useEffect } from 'react';
import '../styles/LevelSystem.css';

const LevelSystem = ({ walletAddress, gameResult }) => {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [nextLevelXp, setNextLevelXp] = useState(10);
  const [prevLevelXp, setPrevLevelXp] = useState(0);
  const [progress, setProgress] = useState(0);

  // Calculate XP needed for a given level
  const calculateXpForLevel = (level) => {
    if (level <= 1) return 0;
    return 10 * (level - 1);
  };

  // Calculate total XP needed to reach a specific level
  const calculateTotalXpForLevel = (level) => {
    if (level <= 1) return 0;
    // Sum of arithmetic progression: n/2 * (first + last)
    // For levels 1 to n, we need sum of 10, 20, 30, ... 10*(n-1)
    return (level - 1) * (10 + 10 * (level - 1)) / 2;
  };

  // Calculate level based on total XP
  const calculateLevelFromXp = (totalXp) => {
    if (totalXp < 10) return 1; // Level 1 needs 0 XP
    
    // Find the highest level where totalXp >= xpNeeded
    let currentLevel = 1;
    while (calculateTotalXpForLevel(currentLevel + 1) <= totalXp) {
      currentLevel++;
      if (currentLevel >= 100) break; // Cap at level 100
    }
    
    return currentLevel;
  };

  // Load XP from localStorage on component mount
  useEffect(() => {
    if (walletAddress) {
      const storedXp = localStorage.getItem(`flipski_xp_${walletAddress.toLowerCase()}`);
      if (storedXp) {
        const parsedXp = parseInt(storedXp, 10);
        setXp(parsedXp);
        
        // Calculate level based on XP
        const calculatedLevel = calculateLevelFromXp(parsedXp);
        setLevel(calculatedLevel);
        
        // Set previous and next level XP thresholds
        const prevXp = calculateTotalXpForLevel(calculatedLevel);
        const nextXp = calculateTotalXpForLevel(calculatedLevel + 1);
        setPrevLevelXp(prevXp);
        setNextLevelXp(nextXp);
        
        // Calculate progress percentage
        const levelXpRange = nextXp - prevXp;
        const currentLevelProgress = parsedXp - prevXp;
        const progressPercentage = levelXpRange > 0 ? (currentLevelProgress / levelXpRange) * 100 : 0;
        setProgress(progressPercentage);
      }
    }
  }, [walletAddress]);

  // Update XP when game results change
  useEffect(() => {
    if (!walletAddress || !gameResult) return;

    // Add XP based on game result (1 for loss, 2 for win)
    const xpToAdd = gameResult.won ? 2 : 1;
    const newTotalXp = xp + xpToAdd;
    
    // Save to localStorage
    localStorage.setItem(`flipski_xp_${walletAddress.toLowerCase()}`, newTotalXp.toString());
    
    // Update state
    setXp(newTotalXp);
    
    // Calculate new level based on updated XP
    const newLevel = calculateLevelFromXp(newTotalXp);
    setLevel(newLevel);
    
    // Update previous and next level XP thresholds
    const prevXp = calculateTotalXpForLevel(newLevel);
    const nextXp = calculateTotalXpForLevel(newLevel + 1);
    setPrevLevelXp(prevXp);
    setNextLevelXp(nextXp);
    
    // Calculate new progress percentage
    const levelXpRange = nextXp - prevXp;
    const currentLevelProgress = newTotalXp - prevXp;
    const progressPercentage = levelXpRange > 0 ? (currentLevelProgress / levelXpRange) * 100 : 0;
    setProgress(progressPercentage);
  }, [walletAddress, gameResult, xp]);

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
