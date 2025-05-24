// Import required modules
require('dotenv').config();
const User = require('../models/User');
const { connectToDatabase, setCorsHeaders } = require('../db');

// Serverless function handler
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
    
    // Get leaderboard data
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
    
    // Return the leaderboard data
    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
