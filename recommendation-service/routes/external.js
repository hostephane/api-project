// recommendation-service/routes/external.js
const express = require('express');
const router = express.Router();
const { fetchPopularMovies } = require('./tmdbClient');

// GET /external/popular?page=1
router.get('/popular', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  console.log('[external] GET /popular?page=' + page);
  try {
    // On récupère directement les films via tmdbClient
    const movies = await fetchPopularMovies(page);
    res.json({ movies });
  } catch (err) {
    console.error('[external] Erreur TMDB', err);
    res.status(502).json({ error: 'Erreur TMDB' });
  }
});

module.exports = router;
