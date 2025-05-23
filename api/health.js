// Health check endpoint
module.exports = async (req, res) => {
    res.status(200).json({ status: 'ok', message: 'FlipSki API is running' });
  };