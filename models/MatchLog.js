// server/models/MatchLog.js
const mongoose = require("mongoose");

const matchLogSchema = new mongoose.Schema({
  user1: { type: String, required: true },
  user2: { type: String, required: true },
  matchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MatchLog", matchLogSchema);
