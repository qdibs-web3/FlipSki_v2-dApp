// Import required modules
require('dotenv').config();
const User = require('../models/User');
const { connectToDatabase, setCorsHeaders } = require('../db');

// Catch-all handler for /api/users/* routes
module.exports = async (req, res) => {
  // Set CORS headers
  setCorsHeaders(res);

  // Add extensive logging for debugging
  console.log('API Request Debug:', {
    method: req.method,
    url: req.url,
    query: req.query,
    params: req.query.params,
    body: req.body,
    headers: req.headers
  });

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Accept all requests for debugging
  if (req.url.includes('update-xp')) {
    console.log('Update-XP endpoint detected');
    
    // Always accept POST for update-xp during debugging
    if (req.method === 'POST') {
      try {
        // Connect to the database
        await connectToDatabase();
        
        // Extract wallet address from URL
        // This is more robust - get it from the URL directly
        const urlParts = req.url.split('/');
        let walletAddress = null;
        
        // Find the wallet address in the URL parts
        for (let i = 0; i < urlParts.length; i++) {
          if (urlParts[i] === 'users' && i + 1 < urlParts.length && urlParts[i + 2] === 'update-xp') {
            walletAddress = urlParts[i + 1];
            break;
          }
        }
        
        console.log('Extracted wallet address:', walletAddress);
        
        if (!walletAddress) {
          return res.status(400).json({ 
            message: 'Wallet address not found in URL',
            debug: { urlParts }
          });
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
      } catch (error) {
        console.error('Error in update-xp endpoint:', error);
        return res.status(500).json({ 
          message: 'Server error', 
          error: error.message,
          stack: error.stack
        });
      }
    } else {
      // For non-POST requests to update-xp
      return res.status(405).json({ 
        message: 'Method not allowed for update-xp endpoint',
        allowedMethods: ['POST'],
        receivedMethod: req.method
      });
    }
  }
  
  // Handle GET user data
  else if (req.method === 'GET') {
    try {
      // Connect to the database
      await connectToDatabase();
      
      // Extract wallet address from URL
      const urlParts = req.url.split('/');
      let walletAddress = null;
      
      // Find the wallet address in the URL parts
      for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'users' && i + 1 < urlParts.length && !urlParts[i + 1].includes('update-xp')) {
          walletAddress = urlParts[i + 1];
          break;
        }
      }
      
      console.log('GET request - extracted wallet address:', walletAddress);
      
      if (!walletAddress) {
        return res.status(400).json({ 
          message: 'Wallet address not found in URL',
          debug: { urlParts }
        });
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
    } catch (error) {
      console.error('Error in GET user data endpoint:', error);
      return res.status(500).json({ 
        message: 'Server error', 
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  // Default response for debugging
  return res.status(200).json({
    message: 'API endpoint reached but not matched to a specific handler',
    debug: {
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.query.params
    }
  });
};
