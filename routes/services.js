router.post('/', upload.single('image'), async (req, res) => {
  try {
   
    const imageUrl = req.file?.path;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image upload failed.' });
    }

   
    const { name, category, description, price, experience, features, userId, type, address, location } = req.body;

    
    const newService = new Service({
      name,
      category,
      description,
      price: parseFloat(price),
      experience: parseInt(experience, 10),
      features,
      images: [imageUrl], 
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