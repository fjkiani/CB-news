const mongoose = require('mongoose');

const newsCategorySchema = new mongoose.Schema({
  type: String,
  keywords: [String],
  weight: Number,
  isActive: Boolean,
  lastUpdated: Date
});

module.exports = mongoose.model('NewsCategory', newsCategorySchema); 

const newsCategorySchema = new mongoose.Schema({
  type: String,
  keywords: [String],
  weight: Number,
  isActive: Boolean,
  lastUpdated: Date
});

module.exports = mongoose.model('NewsCategory', newsCategorySchema); 