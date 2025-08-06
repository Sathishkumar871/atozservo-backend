// server/routes/youtube.js
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

router.get('/search', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query
      )}&key=${YOUTUBE_API_KEY}&maxResults=10&type=video`
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
