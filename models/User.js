// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    unique: true, 
    required: true,
    lowercase: true,
    trim: true 
  },

  otp: {
    type: String
  },

  otpExpiry: {
    type: Date
  },

  name: {
    type: String,
    trim: true
  },

  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },

  phone: {
    type: String,
    trim: true
  },

  district: {
    type: String,
    trim: true
  },

  pincode: {
    type: String,
    trim: true
  },

  village: {
    type: String,
    trim: true
  },

  house: {
    type: String,
    trim: true
  },

  area: {
    type: String,
    trim: true
  },

  addressType: {
    type: String,
    enum: ['Home', 'Work', 'Other']
  },

  profileImage: {
    type: String, // Cloudinary URL will be stored here
    trim: true
  },

  profileCompleted: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true }); // createdAt, updatedAt automaticగా save అవుతాయి

module.exports = mongoose.model('User', userSchema);
