import React, { useState, useEffect } from 'react';
import '../styles/LevelSystem.css';
import axios from 'axios';

// API base URL - automatically adjusts for development or production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

const LevelSystem = ({ walletAddress, gameResult }) => {
  // State
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [nextLevelXp, setNextLevelXp] = useState(10);
  const [processedGameIds, setProcessedGameIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load data when wallet connects
  useEffect(() => {
    if (!walletAddress) return;
    
    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`${API_BASE_URL}/users/${walletAddress}`);
        const userData = response.data;
        
        setXp(userData.xp);
        setLevel(userData.level);
        setNextLevelXp(userData.nextLevelXp);
        setProcessedGameIds(userData.processedGameIds);
      } catch (error) {
        console.error("Error loading user data:", error);
        setError("Failed to load user data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [walletAddress]);
  
  // Process game results
  useEffect(() => {
    if (!walletAddress || !gameResult || !gameResult.gameId) return;
    
    // Skip if already processed locally
    if (processedGameIds.includes(gameResult.gameId)) {
      return;
    }
    
    const updateUserXp = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/users/${walletAddress}/update-xp`, {
          gameId: gameResult.gameId,
          won: gameResult.won
        });
        
        const updatedData = response.data;
        
        // Update state with new data from server
        setXp(updatedData.xp);
        setLevel(updatedData.level);
        setNextLevelXp(updatedData.nextLevelXp);
        setProcessedGameIds(updatedData.processedGameIds);
      } catch (error) {
        console.error("Error updating XP:", error);
        setError("Failed to update XP. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    updateUserXp();
  }, [walletAddress, gameResult, processedGameIds]);
  
  // Calculate progress percentage
  const progressPercentage = (() => {
    const levelStartXp = (level - 1) * 10;
    const xpInCurrentLevel = xp - levelStartXp;
    return Math.min(Math.max((xpInCurrentLevel / 10) * 100, 1), 100);
  })();
  
  
  return (
    <div className="level-system" style={{ maxWidth: '560px', minWidth: '200px' }}>
      {isLoading && <div className="loading-indicator">Loading...</div>}
      {error && <div className="error-message">{error}</div>}
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <p className="level-title" style={{ margin: 0 }}>Level: {level}</p>
        <p className="xp-info" style={{ margin: 0 }}>XP: {xp} / {nextLevelXp}</p>
      </div>
      
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        {/* Current level - inline with progress bar */}
        <span style={{fontSize: '16px', color: '#ffffff', minWidth: '10px'}}>{level}</span>
        
        {/* Progress bar with inline styles */}
        <div style={{
          flex: 1,
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
        
        {/* Next level - inline with progress bar */}
        <span style={{fontSize: '16px', color: '#ffffff', minWidth: '10px', textAlign: 'right'}}>{level < 100 ? level + 1 : 'MAX'}</span>
      </div>
    </div>
  );
};

export default LevelSystem;
