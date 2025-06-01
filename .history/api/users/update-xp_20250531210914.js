// api/users/update-xp.js
// Import required modules
require('dotenv').config();
const User = require('../models/User');
const { connectToDatabase, setCorsHeaders } = require('../db');

// Serverless function handler for updating user XP
module.exports = async (req, res) => {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get wallet address from URL path
    const walletAddress = req.query.walletAddress || '';
    
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }
    
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

    // FIX: Manually recalculate and update the level based on XP
    // This is needed because findOneAndUpdate doesn't trigger the pre('save') middleware
    const updatedLevel = Math.min(Math.floor(user.xp / 10) + 1, 100);
    
    // Only update if level has changed
    if (user.level !== updatedLevel) {
      user.level = updatedLevel;
      await user.save(); // This will trigger the pre('save') middleware but we've already set the level
    }
    
    return res.status(200).json({
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
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
