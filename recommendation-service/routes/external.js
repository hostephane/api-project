// recommendation-service/routes/external.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

// GET /popular?page=1
router.get('/popular', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  console.log('[external] GET /popular?page=' + page);
  try {
    const { data } = await axios.get(`${TMDB_BASE}/movie/popular`, {
      params: { api_key: TMDB_API_KEY, language: 'fr-FR', page }
    });
    const movies = data.results.map(m => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      poster: `https://image.tmdb.org/t/p/w300${m.poster_path}`,
      genres: m.genre_ids
    }));
    // enveloppe dans { movies: [...] }
    res.json({ movies });
  } catch (err) {
    console.error('[external] Erreur TMDB', err);
    res.status(502).json({ error: 'Erreur TMDB' });
  }
});

module.exports = router;
