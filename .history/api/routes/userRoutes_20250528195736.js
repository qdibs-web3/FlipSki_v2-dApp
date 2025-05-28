// api/routes/userRoutes.js
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
    
    // Use findOneAndUpdate with $setOnInsert to ensure XP is not incremented on creation
    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { 
        $setOnInsert: {
          walletAddress: walletAddress.toLowerCase(),
          xp: 0,
          level: 1,
          wins: 0,
          losses: 0,
          processedGameIds: []
        }
      },
      { 
        new: true,
        upsert: true,
        runValidators: true
      }
    );
    
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
    
    // First, check if the game is already processed for this user
    const existingUser = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase(),
      processedGameIds: gameId
    });
    
    if (existingUser) {
      return res.status(200).json({
        message: 'Game already processed',
        walletAddress: existingUser.walletAddress,
        xp: existingUser.xp,
        level: existingUser.level,
        wins: existingUser.wins,
        losses: existingUser.losses,
        nextLevelXp: existingUser.level * 10,
        processedGameIds: existingUser.processedGameIds
      });
    }
    
    // Check if user exists first without modifying
    const userExists = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });
    
    if (!userExists) {
      // Create new user without incrementing XP
      const newUser = await User.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        { 
          $setOnInsert: {
            walletAddress: walletAddress.toLowerCase(),
            xp: 0,
            level: 1,
            wins: 0,
            losses: 0,
            processedGameIds: []
          }
        },
        { 
          new: true,
          upsert: true,
          runValidators: true
        }
      );
      
      return res.status(200).json({
        message: 'User created',
        walletAddress: newUser.walletAddress,
        xp: newUser.xp,
        level: newUser.level,
        wins: newUser.wins,
        losses: newUser.losses,
        nextLevelXp: newUser.level * 10,
        processedGameIds: newUser.processedGameIds,
        xpAdded: 0
      });
    }
    
    // Calculate XP to add
    const xpToAdd = won ? 2 : 1;
    
    // Use findOneAndUpdate to atomically update the existing user
    const user = await User.findOneAndUpdate(
      { 
        walletAddress: walletAddress.toLowerCase(),
        processedGameIds: { $ne: gameId } // Ensure game not already processed
      },
      { 
        $inc: { 
          xp: xpToAdd,
          wins: won ? 1 : 0,
          losses: won ? 0 : 1
        },
        $push: { processedGameIds: gameId }
      },
      { 
        new: true,
        runValidators: true
      }
    );
    
    // If no update was made (game already processed), return the current user
    if (!user) {
      const currentUser = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      return res.status(200).json({
        message: 'Game already processed or user not found',
        walletAddress: currentUser.walletAddress,
        xp: currentUser.xp,
        level: currentUser.level,
        wins: currentUser.wins,
        losses: currentUser.losses,
        nextLevelXp: currentUser.level * 10,
        processedGameIds: currentUser.processedGameIds
      });
    }
    
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
