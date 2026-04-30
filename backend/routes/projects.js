const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/projects - get all projects user is part of
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.name as owner_name, pm.role as my_role,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      JOIN users u ON p.owner_id = u.id
      WHERE pm.user_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/projects - create project (admin only)
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create projects.' });
  }

  const { name, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const project = await client.query(
      `INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, description, req.user.id]
    );
    // Auto-add creator as admin member
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [project.rows[0].id, req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json(project.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    client.release();
  }
});

// GET /api/projects/:id - get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await pool.query(`
      SELECT p.*, u.name as owner_name, pm.role as my_role
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = $1
    `, [req.params.id, req.user.id]);

    if (project.rows.length === 0) return res.status(404).json({ message: 'Project not found or access denied.' });

    const members = await pool.query(`
      SELECT u.id, u.name, u.email, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `, [req.params.id]);

    res.json({ ...project.rows[0], members: members.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/projects/:id - update project
router.put('/:id', authenticate, async (req, res) => {
  const { name, description } = req.body;
  try {
    const memberCheck = await pool.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Only project admins can update projects.' });
    }

    const result = await pool.query(
      `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *`,
      [name, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/projects/:id - delete project
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await pool.query(`SELECT owner_id FROM projects WHERE id = $1`, [req.params.id]);
    if (project.rows.length === 0) return res.status(404).json({ message: 'Project not found.' });
    if (project.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this project.' });
    }
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/projects/:id/members - add member
router.post('/:id/members', authenticate, async (req, res) => {
  const { user_id, role = 'member' } = req.body;
  try {
    const memberCheck = await pool.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Only project admins can add members.' });
    }

    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO NOTHING`,
      [req.params.id, user_id, role]
    );
    res.status(201).json({ message: 'Member added successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/projects/:id/members/:userId - remove member
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const memberCheck = await pool.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Only project admins can remove members.' });
    }
    await pool.query(
      `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
