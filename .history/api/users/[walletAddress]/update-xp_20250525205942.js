// Import required modules
require('dotenv').config();
const User = require('../../models/User');
const { connectToDatabase, setCorsHeaders } = require('../../db');

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
    
    // Get wallet address from URL path parameter
    const walletAddress = req.query.walletAddress || '';
    
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }
    
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
