// recommendation-service/routes/external.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

router.get('/movies', async (req, res) => {
    console.log('[external] GET /movies appelé');
  try {
    const { data } = await axios.get(`${TMDB_BASE}/movie/popular`, {
      params: { api_key: TMDB_API_KEY, language: 'fr-FR', page: 1 }
    });
    const movies = data.results.map(m => ({
      id: m.id,
      title: m.title,
      genre_ids: m.genre_ids,
      poster: `https://image.tmdb.org/t/p/w200${m.poster_path}`
    }));
    res.json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur TMDB' });
  }
});

module.exports = router;
