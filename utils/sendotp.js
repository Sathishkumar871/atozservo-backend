const nodemailer = require('nodemailer');
require('dotenv').config();

const SendOtp = async (email, otpCode) => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  const istTime = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const htmlContent = `
  <div style="max-width: 500px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 0 15px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(90deg, #2b7cff, #00bfff); padding: 30px; text-align: center;">
      <img src="https://yourdomain.com/logo.png" alt="AtoZ Services" style="height: 55px;" />
    </div>
    <div style="padding: 35px;">
      <h2 style="color: #222; margin: 0 0 15px;">Hello 👋</h2>
      <p style="font-size: 16px; color: #444;">Use the OTP below to verify your email on <strong>AtoZ Services</strong>.</p>

      <div style="font-size: 36px; letter-spacing: 12px; font-weight: bold; background: #f1f8ff; color: #2b7cff; padding: 25px; text-align: center; border-radius: 8px; margin: 30px 0;">
        ${otpCode}
      </div>

      <p style="font-size: 15px; color: #555;">This OTP is valid until <strong>${istTime} IST</strong>.</p>

      <div style="margin-top: 30px; background: #fffbe6; border-left: 4px solid #ffc107; padding: 15px 20px; border-radius: 5px;">
        <strong style="color: #e69500;">⚠️ Security Tip:</strong>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Never share your OTP with anyone. AtoZ Services will never ask for your OTP.</p>
      </div>

      <p style="margin-top: 35px; font-size: 13px; color: #888;">If you did not request this OTP, please ignore this email.</p>
    </div>

    <div style="background: #f7f7f7; padding: 20px; text-align: center; font-size: 12px; color: #777;">
      Need help? 
      <a href="https://wa.me/918179477995" style="color: #2b7cff; text-decoration: none;">Contact Support on WhatsApp</a><br/>
      © ${new Date().getFullYear()} AtoZ Services · All rights reserved.
    </div>
  </div>
  `;

  try {
    let info = await transporter.sendMail({
      from: `"AtoZ Services" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Your OTP Code - AtoZ Services',
      html: htmlContent,
    });
    console.log('✅ Mail sent:', info.response);
  } catch (err) {
    console.error('❌ Mail error:', err);
    throw err;
  }
};

module.exports = SendOtp;
