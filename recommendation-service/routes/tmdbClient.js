// recommendation-service/routes/tmdbClient.js
const axios = require('axios');
const BASE = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const KEY = process.env.TMDB_API_KEY;

async function fetchPopularMovies(page = 1) {
  const url = `${BASE}/movie/popular`;
  const { data } = await axios.get(url, {
    params: { api_key: KEY, language: 'fr-FR', page }
  });
  return data.results.map(m => ({
    id: m.id,
    title: m.title,
    overview: m.overview,
    poster: `https://image.tmdb.org/t/p/w300${m.poster_path}`,
    genres: m.genre_ids
  }));
}

module.exports = { fetchPopularMovies };
