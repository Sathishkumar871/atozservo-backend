const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  experience: { type: Number, default: 0 },
  features: { type: String, default: '' },
  images: { type: [String], default: [] }, // This is correct for storing an array of URLs (and is optional)
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, // Assuming you have a 'User' model
  type: { type: String, enum: ['service', 'owner'], default: 'service', required: true },
  address: { type: String, default: '' },
  location: { // Nested object for lat/lng
    lat: { type: Number, required: false }, // Made optional as per your current logic
    lng: { type: Number, required: false }, // Made optional
  },
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

module.exports = mongoose.model('Service', ServiceSchema);