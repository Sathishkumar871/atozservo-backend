const express = require('express');
const Service = require('../models/Service'); // మీ Service మోడల్ కు సరైన పాత్ ఇవ్వండి
const router = express.Router();

// --- Multer మరియు Cloudinary కాన్ఫిగరేషన్ ఈ ఫైల్ లోనే నేరుగా ఉంది ---
// ఇది 'MODULE_NOT_FOUND' వంటి పాత్ సంబంధిత లోపాలను నివారిస్తుంది.
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary కాన్ఫిగరేషన్: మీ .env ఫైల్ నుండి వేరియబుల్స్ సరిగ్గా లోడ్ అవుతున్నాయని నిర్ధారించుకోండి.
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // 'processs' అనే టైపో సరిచేయబడింది
});

// Multer + Cloudinary Storage ఇమేజ్ అప్‌లోడ్‌లను హ్యాండిల్ చేయడానికి సెటప్
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'services', // Cloudinary లో ఇమేజ్‌లు నిల్వ చేయబడే ఫోల్డర్
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});
const upload = multer({ storage });
// --- Multer మరియు Cloudinary కాన్ఫిగరేషన్ ముగింపు ---


// 📤 ఇమేజ్ అప్‌లోడ్ రూట్: ఫ్రంట్‌ఎండ్ ఇమేజ్‌ను అప్‌లోడ్ చేసి URL ను పొందడానికి దీన్ని ముందుగా కాల్ చేస్తుంది.
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file?.path; // అప్‌లోడ్ చేసిన ఇమేజ్ యొక్క Cloudinary URL
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image upload failed – no file received or processed.' });
    }
    console.log('✅ Backend: Image uploaded to Cloudinary successfully. URL:', imageUrl); // డీబగ్గింగ్ లాగ్
    res.json({ url: imageUrl }); // URL ను ఫ్రంట్‌ఎండ్‌కు తిరిగి పంపండి
  } catch (err) {
    console.error('❌ Backend: Cloudinary Upload Error:', err);
    res.status(500).json({ error: 'Image upload failed on the server side.' });
  }
});

// 📝 సర్వీస్ క్రియేట్ రూట్: ఫ్రంట్‌ఎండ్ అన్ని సర్వీస్ వివరాలతో (ఇమేజ్ URLలతో సహా) దీన్ని రెండవదిగా కాల్ చేస్తుంది.
router.post('/', async (req, res) => {
  try {
    // డీస్ట్రక్చర్ అన్ని ఫీల్డ్‌లు ఫ్రంట్‌ఎండ్ postData నుండి ఆశించబడినవి
    const {
      name,
      category,
      description,
      price,
      experience,
      features,
      images, // ఇది ఫ్రంట్‌ఎండ్ నుండి వచ్చే Cloudinary URL ల అరే
      userId,
      type,
      address,
      location // ఇది {lat, lng} ఆబ్జెక్ట్ లేదా null
    } = req.body;

    // --- ముఖ్యమైన డీబగ్గింగ్ లాగ్‌లు ---
    // ఇవి బ్యాకెండ్ ఫ్రంట్‌ఎండ్ నుండి ఏ డేటాను అందుకుంటుందో చూపుతాయి.
    console.log('Backend: Received POST /api/services req.body:', req.body);
    console.log('Backend: Received images array for saving:', images);
    // --- డీబగ్గింగ్ లాగ్‌ల ముగింపు ---

    // ✨✨✨ వాలిడేషన్ లాజిక్ (Name and image are required సమస్యను పరిష్కరించడానికి) ✨✨✨
    // ఈ వాలిడేషన్ ఇతర తప్పనిసరి ఫీల్డ్‌లను మాత్రమే తనిఖీ చేస్తుంది. ఇమేజ్‌లు ఇప్పుడు ఆప్షనల్.
    if (!name || !category || !description || !price || !userId || !type) {
        // ఈ మెసేజ్ "Name and image are required" కి బదులుగా మరింత ఖచ్చితమైనది.
        return res.status(400).json({ error: 'Missing essential service details (name, category, description, price, type, or user ID).' });
    }

    // ఇమేజ్‌ల వాలిడేషన్:
    // 'images' ఫీల్డ్ అందించబడితే, అది ఖచ్చితంగా అరే అయి ఉండాలి అని మాత్రమే ఇది తనిఖీ చేస్తుంది.
    // ఇది కనీసం ఒక ఇమేజ్ తప్పనిసరి అని కోరదు (ఇమేజ్‌లు ఇప్పుడు ఆప్షనల్).
    if (images && !Array.isArray(images)) {
        return res.status(400).json({ error: 'Images field must be an array of URLs if provided.' });
    }
    // మీరు కనీసం ఒక ఇమేజ్ తప్పనిసరి అని నిర్బంధించాలనుకుంటే, క్రింది లైన్‌ను అన్-కమెంట్ చేయండి:
    // if (images.length === 0) { // 'images' లేకపోతే లేదా ఖాళీగా ఉంటే
    //   return res.status(400).json({ error: 'At least one image is required for the service.' });
    // }


    // అన్ని డీస్ట్రక్చర్ చేసిన డేటాతో కొత్త Service ఇన్స్‌టాన్స్‌ను సృష్టించండి.
    const newService = new Service({
      name,
      category,
      description,
      // price మరియు experience ను నంబర్‌లుగా మార్చండి (req.body లోని స్ట్రింగ్ నుండి) స్కీమాకు సరిపోయేలా.
      price: parseFloat(price),
      experience: parseInt(experience, 10),
      features,
      images: images || [], // Cloudinary URL ల అరేను పాస్ చేయండి. 'images' null/undefined అయితే, ఖాళీ అరేని పాస్ చేస్తుంది.
      userId,
      type,
      address,
      location: location || null,
    });

    const saved = await newService.save(); // కొత్త సర్వీస్ డాక్యుమెంట్‌ను MongoDB లో సేవ్ చేయడానికి ప్రయత్నించండి
    console.log('✅ Backend: Service saved to MongoDB successfully:', saved); // విజయవంతమైన సేవ్ తో ధృవీకరించండి
    res.status(201).json(saved); // సేవ్ చేయబడిన సర్వీస్ డాక్యుమెంట్‌ను రెస్పాన్స్‌గా తిరిగి పంపండి

  } catch (err) {
    console.error('❌ Backend: Service Creation Error:', err); // పూర్తి ఎర్రర్ ఆబ్జెక్ట్‌ను వివరణాత్మక సమాచారం కోసం లాగ్ చేయండి
    // ఫ్రంట్‌ఎండ్‌కు మరింత వివరణాత్మక ఎర్రర్ మెసేజ్‌ను అందించండి, ముఖ్యంగా డెవలప్‌మెంట్ సమయంలో.
    const errorMessage = err.message || 'Service creation failed.';
    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err : undefined // డెవలప్‌మెంట్ మోడ్‌లో పూర్తి ఎర్రర్‌ను చూపండి
    });
  }
});

// 🔍 సర్వీస్‌లను పొందడానికి రూట్ (పూర్తి చేయడానికి చేర్చబడింది)
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
    console.error('❌ Backend: Service Fetch Error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;