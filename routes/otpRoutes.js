const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const SendOtp = require('../utils/sendotp'); // Function to send email
require('dotenv').config();

// OTP generator (4-digit)
const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

/**
 * POST /send-otp
 * Send OTP to user's email
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const otp = generateOtp();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, otp, otpExpiry: expiry });
    } else {
      user.otp = otp;
      user.otpExpiry = expiry;
    }
    await user.save();

    await SendOtp(email, otp);

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /verify-otp
 * Verify OTP and issue JWT
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or OTP' }); // Generic message

    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid email or OTP' }); // Generic message
    if (Date.now() > user.otpExpiry) return res.status(400).json({ message: 'OTP expired' });

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'OTP verified', token });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /check-session
 * Verify JWT token validity
 */
router.post('/check-session', (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ valid: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, email: decoded.email });
  } catch (err) {
    console.error('Token verification failed:', err);
    res.json({ valid: false });
  }
});

/**
 * POST /get-user
 * Get user data by email
 */
router.post('/get-user', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        email: user.email,
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || {},
        profileCompleted: user.profileCompleted || false,
      },
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
