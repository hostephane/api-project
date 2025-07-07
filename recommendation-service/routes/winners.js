const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');

// POST /winners
router.post('/', async (req, res) => {
  const { userId, filmId } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO winners (user_id, film_id) VALUES ($1, $2) RETURNING *',
      [userId, filmId]
    );
    res.status(201).json({ message: 'Winner saved', data: result.rows[0] });
  } catch (err) {
    console.error('Error saving winner:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /winners/stats
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT film_id, COUNT(*) AS count, MAX(timestamp) AS last_win
      FROM winners
      GROUP BY film_id
      ORDER BY count DESC
      LIMIT 5;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching winner stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
