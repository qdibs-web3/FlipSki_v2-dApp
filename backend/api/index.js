module.exports = (req, res) => {
    // This is a serverless function wrapper for Vercel
    // It imports and uses the Express app from index.js
    const app = require('../../index');
    return app(req, res);
  }