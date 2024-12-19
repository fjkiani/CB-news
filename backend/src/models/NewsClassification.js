const mongoose = require('mongoose');

const newsClassificationSchema = new mongoose.Schema({
  name: String,
  threshold: Number,
  importance: Number,
  isActive: Boolean,
  lastUpdated: Date
});

module.exports = mongoose.model('NewsClassification', newsClassificationSchema); 