const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

const authorizeProjectAdmin = async (req, res, next) => {
  const { pool } = require('../db');
  const projectId = req.params.projectId || req.body.project_id;
  try {
    const result = await pool.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this project.' });
    }
    req.projectRole = result.rows[0].role;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { authenticate, authorizeAdmin, authorizeProjectAdmin };
