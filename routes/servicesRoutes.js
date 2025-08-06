const express = require('express');
const Service = require('../models/Service');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'services',
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});
const upload = multer({ storage });

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file?.path;
    if (!imageUrl) return res.status(400).json({ error: 'Image upload failed.' });
    res.json({ url: imageUrl });
  } catch (err) {
    console.error('Cloudinary Upload Error:', err);
    res.status(500).json({ error: 'Server error during image upload.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name, category, description, price,
      experience, features, images,
      userId, type, address, location
    } = req.body;

    if (!name || !category || !description || !price || !userId || !type) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    if (images && !Array.isArray(images)) {
      return res.status(400).json({ error: 'Images must be an array.' });
    }

    const newService = new Service({
      name,
      category,
      description,
      price: parseFloat(price),
      experience: parseInt(experience, 10),
      features,
      images: images || [],
      userId,
      type,
      address,
      location: location || null,
    });

    const saved = await newService.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Service Creation Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create service.' });
  }
});

router.get('/', async (req, res) => {
  const query = req.query.search || '';
  try {
    const results = query
      ? await Service.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } },
          ],
        }).limit(50)
      : await Service.find();
    res.json(results);
  } catch (err) {
    console.error('Service Fetch Error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
