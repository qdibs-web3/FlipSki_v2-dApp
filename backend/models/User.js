const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  processedGameIds: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate level based on XP before saving
userSchema.pre('save', function(next) {
  // Calculate level: 10 XP per level, max level 100
  this.level = Math.min(Math.floor(this.xp / 10) + 1, 100);
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
