const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  otp: String,
  otpExpiry: Date,

  name: String,
  gender: String,
  phone: String, 
  district: String, 
  pincode: String,
  village: String,
  house: String,
  area: String,
  addressType: String,
  profileImage: String, 

  profileCompleted: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', userSchema);