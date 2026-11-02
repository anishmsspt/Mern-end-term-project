const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  title: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  fetchedAt: { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model('ProblemCache', schema);
