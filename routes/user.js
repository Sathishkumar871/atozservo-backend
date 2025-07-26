const express = require("express");
const router = express.Router();
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const DB_NAME = "atozservo";

// ✅ Middleware to verify token and attach user
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Inject decoded user data (e.g., { email })
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}

// 🔗 Connect to MongoDB
async function connectDB() {
  const client = await MongoClient.connect(MONGODB_URI);
  return { client, db: client.db(DB_NAME) };
}

// 📝 1️⃣ Update User Profile API (with auth)
router.post("/update-profile", authenticate, async (req, res) => {
  const { name, phone, address, profileImage } = req.body;
  const email = req.user.email; // ✅ get from token instead of body

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const { client, db } = await connectDB();

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (address) updateFields.address = address;
    if (profileImage) updateFields.profileImage = profileImage;
    updateFields.profileCompleted = true;

    await db.collection("users").updateOne(
      { email },
      { $set: updateFields },
      { upsert: true }
    );

    client.close();
    res.status(200).json({ message: "✅ Profile updated successfully" });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

module.exports = router;
