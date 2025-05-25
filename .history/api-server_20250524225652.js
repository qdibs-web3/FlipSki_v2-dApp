// Local development server for API endpoints
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Dynamically load API routes
const apiDir = path.join(__dirname, 'api');

// First, load the db.js module if it exists
let dbModule = null;
const dbPath = path.join(apiDir, 'db.js');
if (fs.existsSync(dbPath)) {
  dbModule = require(dbPath);
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const healthModule = require('./api/health');
    await healthModule(req, res);
  } catch (error) {
    console.error('Error in health endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User endpoints
app.get('/api/users/leaderboard', async (req, res) => {
  try {
    const leaderboardModule = require('./api/users/leaderboard');
    await leaderboardModule(req, res);
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dynamic user route with wallet address
app.get('/api/users/:walletAddress', async (req, res) => {
  try {
    // Add the wallet address to the query params to match the serverless function expectation
    req.query.walletAddress = req.params.walletAddress;
    
    const userModule = require('./api/users/index');
    await userModule(req, res);
  } catch (error) {
    console.error('Error in user endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback for the original query parameter route
app.get('/api/users', async (req, res) => {
  try {
    const userModule = require('./api/users/index');
    await userModule(req, res);
  } catch (error) {
    console.error('Error in user endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update XP endpoint with wallet address in URL
app.post('/api/users/:walletAddress/update-xp', async (req, res) => {
  try {
    // Add the wallet address to the query params to match the serverless function expectation
    req.query.walletAddress = req.params.walletAddress;
    
    const updateXpModule = require('./api/users/update-xp');
    await updateXpModule(req, res);
  } catch (error) {
    console.error('Error in update-xp endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback for the original update-xp route
app.post('/api/users/update-xp', async (req, res) => {
  try {
    const updateXpModule = require('./api/users/update-xp');
    await updateXpModule(req, res);
  } catch (error) {
    console.error('Error in update-xp endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET  /api/health');
  console.log('- GET  /api/users/leaderboard');
  console.log('- GET  /api/users/:walletAddress');
  console.log('- POST /api/users/:walletAddress/update-xp');
});
