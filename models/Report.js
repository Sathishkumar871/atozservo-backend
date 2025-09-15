const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    roomId: String,
    displayName: String,
    callStart: Date,
    callEnd: Date,
    reactions: mongoose.Schema.Types.Mixed,
    peers: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);