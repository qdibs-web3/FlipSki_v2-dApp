// api/users/index.js
// Import required modules
require('dotenv').config();
const User = require('../models/User');
const { connectToDatabase, setCorsHeaders } = require('../db');

// Serverless function handler for getting user data by wallet address
module.exports = async (req, res) => {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
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
    
    // Return user data
    return res.status(200).json({
      walletAddress: user.walletAddress,
      xp: user.xp,
      level: user.level,
      wins: user.wins,
      losses: user.losses,
      nextLevelXp: user.level * 10,
      processedGameIds: user.processedGameIds
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
