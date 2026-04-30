const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/users - list all users (for adding to projects / assigning tasks)
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at FROM users ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
