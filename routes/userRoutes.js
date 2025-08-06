const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const User = require("../models/User");
const multer = require("multer"); 
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Multer setup for in-memory storage.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * 🔄 GET /api/user/me
 * Fetches the user's data using the JWT token
 */
router.get("/me", authMiddleware, async (req, res) => {
    try {
        // req.user.id authMiddleware nundi vastundi
        const user = await User.findById(req.user.id).select('-otp -otpExpiry');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ user });
    } catch (err) {
        console.error("❌ Fetch user error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


/**
 * ✅ POST /api/user/upload-image
 * Uploads a profile image to Cloudinary and saves the URL to the user's profile
 */
router.post("/upload-image", authMiddleware, upload.single("profileImage"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        const email = req.user.email;
        let cld_upload_stream = cloudinary.uploader.upload_stream(
            { folder: "profile-images" },
            async function (error, result) {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return res.status(500).json({ message: "Image upload failed" });
                }

                const updatedUser = await User.findOneAndUpdate(
                    { email },
                    { $set: { profileImage: result.secure_url } },
                    { new: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ message: "User not found" });
                }

                res.status(200).json({
                    message: "✅ Profile image updated successfully",
                    imageUrl: result.secure_url
                });
            }
        );

        streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);

    } catch (err) {
        console.error("❌ Image upload route error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


/**
 * ✅ POST /api/user/update-profile
 * Updates other profile details
 */
router.post("/update-profile", authMiddleware, async (req, res) => {
    const { email } = req.user;

    const {
      name,
      phone,
      pincode,
      village,
      house,
      area,
      district,
      addressType,
      gender
    } = req.body;

    if (!email) {
      return res.status(401).json({ message: "Unauthorized: Email missing" });
    }

    const updateFields = {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(pincode && { pincode }),
      ...(village && { village }),
      ...(house && { house }),
      ...(area && { area }),
      ...(district && { district }),
      ...(addressType && { addressType }),
      ...(gender && { gender }),
      profileCompleted: true
    };

    try {
      const updated = await User.findOneAndUpdate(
        { email },
        { $set: updateFields },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({ message: "✅ Profile updated successfully" });
    } catch (err) {
      console.error("❌ Profile update error:", err);
      return res.status(500).json({ message: "❌ Failed to update profile" });
    }
});


module.exports = router;