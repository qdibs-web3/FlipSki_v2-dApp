const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get leaderboard data
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ xp: -1 }) // Sort by XP in descending order
      .select('walletAddress xp level wins losses');
    
    const leaderboard = users.map(user => {
      const wlRatio = user.wins > 0 ? (user.wins / (user.wins + user.losses)).toFixed(2) : '0.00';
      
      return {
        walletAddress: user.walletAddress,
        level: user.level,
        xp: user.xp,
        wins: user.wins,
        losses: user.losses,
        wlRatio: wlRatio
      };
    });
    
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user data by wallet address
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Find user or create if not exists
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        xp: 0,
        level: 1,
        processedGameIds: []
      });
      await user.save();
    }
    
    res.status(200).json({
      walletAddress: user.walletAddress,
      xp: user.xp,
      level: user.level,
      nextLevelXp: user.level * 10,
      processedGameIds: user.processedGameIds
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user XP based on game result
router.post('/:walletAddress/update-xp', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { gameId, won } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ message: 'Game ID is required' });
    }
    
    // Find user or create if not exists
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        xp: 0,
        level: 1,
        wins: 0,
        losses: 0,
        processedGameIds: []
      });
    }
    
    // Check if game already processed
    if (user.processedGameIds.includes(gameId)) {
      return res.status(200).json({
        message: 'Game already processed',
        walletAddress: user.walletAddress,
        xp: user.xp,
        level: user.level,
        wins: user.wins,
        losses: user.losses,
        nextLevelXp: user.level * 10,
        processedGameIds: user.processedGameIds
      });
    }
    
    // Calculate XP to add
    const xpToAdd = won ? 2 : 1;
    user.xp += xpToAdd;
    
    // Update win/loss counters
    if (won) {
      user.wins += 1;
    } else {
      user.losses += 1;
    }
    
    // Add game to processed list
    user.processedGameIds.push(gameId);
    
    // Save user
    await user.save();
    
    res.status(200).json({
      message: 'XP updated successfully',
      walletAddress: user.walletAddress,
      xp: user.xp,
      level: user.level,
      wins: user.wins,
      losses: user.losses,
      nextLevelXp: user.level * 10,
      processedGameIds: user.processedGameIds,
      xpAdded: xpToAdd
    });
  } catch (error) {
    console.error('Error updating XP:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
