router.post('/', upload.single('image'), async (req, res) => {
  try {
    // 1. క్లౌడనరీలో సేవ్ అయిన ఇమేజ్ URL ను తీసుకుంటారు
    const imageUrl = req.file?.path;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image upload failed.' });
    }

    // 2. ఫ్రంటెండ్ నుండి వచ్చిన మిగతా డేటాను తీసుకుంటారు
    const { name, category, description, price, experience, features, userId, type, address, location } = req.body;

    // 3. కొత్త Service ఆబ్జెక్ట్ ను సృష్టించి, image URL ను ఇమేజెస్ అరే లో చేరుస్తారు
    const newService = new Service({
      name,
      category,
      description,
      price: parseFloat(price),
      experience: parseInt(experience, 10),
      features,
      images: [imageUrl], // క్లౌడనరీ URL ను ఇక్కడ సేవ్ చేస్తారు
      userId,
      type,
      address,
      location: location || null,
    });

    // 4. డేటాను MongoDB లో సేవ్ చేస్తారు
    const saved = await newService.save();

    res.status(201).json(saved);
  } catch (err) {
    console.error('Service Creation Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create service.' });
  }
});