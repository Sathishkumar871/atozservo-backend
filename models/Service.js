const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  experience: { type: Number, default: 0 },
  features: { type: String, default: '' },
  images: { type: [String], default: [] }, 
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, // Assuming you have a 'User' model
  type: { type: String, enum: ['service', 'owner'], default: 'service', required: true },
  address: { type: String, default: '' },
  location: { // Nested object for lat/lng
    lat: { type: Number, required: false }, 
    lng: { type: Number, required: false }, 
  },
}, { timestamps: true }); 

module.exports = mongoose.model('Service', ServiceSchema);