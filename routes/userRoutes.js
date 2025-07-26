const express = require("express");
const router = express.Router();
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "atozservo"; // replace with your DB name

// 🔗 Helper function to connect DB
async function connectDB() {
  const client = await MongoClient.connect(MONGODB_URI);
  return { client, db: client.db(DB_NAME) };
}

//
// 1️⃣ Store Device API – after OTP verify
//
router.post("/store-device", async (req, res) => {
  const { email, deviceId } = req.body;
  if (!email || !deviceId) {
    return res.status(400).json({ message: "Missing email or deviceId" });
  }

  try {
    const { client, db } = await connectDB();
    await db.collection("devices").updateOne(
      { deviceId },
      { $set: { email, deviceId } },
      { upsert: true }
    );
    client.close();
    res.status(200).json({ message: "✅ Device stored successfully" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error storing device" });
  }
});

//
// 2️⃣ Auto Login API – app open lo check cheyyadam
//
router.post("/auto-login", async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ message: "Missing deviceId" });
  }

  try {
    const { client, db } = await connectDB();
    const record = await db.collection("devices").findOne({ deviceId });
    client.close();

    if (record?.email) {
      res.status(200).json({ user: { email: record.email, profileCompleted: false } });
    } else {
      res.status(404).json({ message: "Device not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "❌ Error during auto login" });
  }
});

//
// 3️⃣ Remove Device API – logout click lo cleanup
//
router.post("/remove-device", async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ message: "Missing deviceId" });
  }

  try {
    const { client, db } = await connectDB();
    await db.collection("devices").deleteOne({ deviceId });
    client.close();
    res.status(200).json({ message: "🚪 Device removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error removing device" });
  }
});

//
// 4️⃣ ✅ Update Profile API (FINAL REQUIRED ONE)
//
router.post("/update-profile", async (req, res) => {
  const { email, name, phone, pincode, village, house, area, addressType, gender } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const { client, db } = await connectDB();

    const updateFields = {
      name,
      phone,
      pincode,
      village,
      house,
      area,
      addressType,
      gender,
      profileCompleted: true
    };

    await db.collection("users").updateOne(
      { email },
      { $set: updateFields },
      { upsert: true }
    );

    client.close();
    res.status(200).json({ message: "✅ Profile updated successfully" });
  } catch (err) {
    console.error("❌ Profile update error:", err);
    res.status(500).json({ message: "❌ Failed to update profile" });
  }
});

module.exports = router;
