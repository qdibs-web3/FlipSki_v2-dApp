// Import required modules
require('dotenv').config();
const User = require('../models/User');
const { connectToDatabase, setCorsHeaders } = require('../db');

// Catch-all handler for /api/users/* routes
module.exports = async (req, res) => {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get the path parameters from the URL
  const params = req.query.params || [];
  
  // Convert params to a path string for easier matching
  const path = Array.isArray(params) ? params.join('/') : params;

  try {
    // Connect to the database
    await connectToDatabase();

    // Handle update-xp endpoint: /api/users/{walletAddress}/update-xp
    if (path.includes('/update-xp') || path.endsWith('update-xp')) {
      // Extract wallet address from path
      let walletAddress;
      if (Array.isArray(params) && params.length >= 2) {
        // If params is an array, the wallet address is the second-to-last element
        walletAddress = params[params.length - 2];
      } else {
        // Try to extract from path string
        const parts = path.split('/');
        walletAddress = parts[parts.length - 2];
      }

      // Only allow POST requests for update-xp
      if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed for update-xp endpoint' });
      }

      const { gameId, won } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address is required' });
      }
      
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
      
      // Check if game already processed - with defensive check for processedGameIds
      if (Array.isArray(user.processedGameIds) && user.processedGameIds.includes(gameId)) {
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
    }
    
    // Handle GET user data: /api/users/{walletAddress}
    else if (path && !path.includes('/')) {
      // The path is just the wallet address
      const walletAddress = path;
      
      // Only allow GET requests for user data
      if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed for user data endpoint' });
      }
      
      if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address is required' });
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
        await user.save();
      }
      
      return res.status(200).json({
        walletAddress: user.walletAddress,
        xp: user.xp,
        level: user.level,
        wins: user.wins,
        losses: user.losses,
        nextLevelXp: user.level * 10,
        processedGameIds: user.processedGameIds
      });
    }
    
    // Default: endpoint not found
    else {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
