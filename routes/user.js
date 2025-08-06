const express = require("express");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");

const router = express.Router();
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// 🔐 Token Authentication Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user info (like email) from token
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}

// 🧩 Connect to MongoDB
async function connectToDb() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(); // returns the DB object
}

// 📝 POST /api/user/update-profile
router.post("/update-profile", authenticate, async (req, res) => {
  const { name, phone, address, profileImage } = req.body;
  const email = req.user.email;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const updateFields = {};
  if (name) updateFields.name = name;
  if (phone) updateFields.phone = phone;
  if (address) updateFields.address = address;
  if (profileImage) updateFields.profileImage = profileImage;
  updateFields.profileCompleted = true;

  try {
    const db = await connectToDb();

    await db.collection("users").updateOne(
      { email },
      { $set: updateFields },
      { upsert: true }
    );

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
