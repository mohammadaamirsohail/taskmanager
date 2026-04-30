const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

// Helper: check project membership
const isMember = async (projectId, userId) => {
  const result = await pool.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return result.rows[0] || null;
};

// GET /api/tasks?project_id=X - get tasks for a project
router.get('/', authenticate, async (req, res) => {
  const { project_id, status, assigned_to } = req.query;
  try {
    if (!project_id) return res.status(400).json({ message: 'project_id is required.' });

    const membership = await isMember(project_id, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Not a member of this project.' });

    let query = `
      SELECT t.*, 
        u1.name as assigned_to_name, 
        u2.name as created_by_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.project_id = $1
    `;
    const params = [project_id];

    if (status) { query += ` AND t.status = $${params.length + 1}`; params.push(status); }
    if (assigned_to) { query += ` AND t.assigned_to = $${params.length + 1}`; params.push(assigned_to); }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/tasks - create task
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('project_id').isInt().withMessage('Valid project_id is required'),
  body('status').optional().isIn(['todo', 'in_progress', 'completed', 'overdue']),
  body('priority').optional().isIn(['low', 'medium', 'high'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, project_id, assigned_to, status = 'todo', priority = 'medium', due_date } = req.body;
  try {
    const membership = await isMember(project_id, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Not a member of this project.' });

    if (membership.role !== 'admin') {
      return res.status(403).json({ message: 'Only project admins can create tasks.' });
    }

    const result = await pool.query(`
      INSERT INTO tasks (title, description, project_id, assigned_to, created_by, status, priority, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, description, project_id, assigned_to || null, req.user.id, status, priority, due_date || null]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/tasks/:id - get single task
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u1.name as assigned_to_name, u2.name as created_by_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Task not found.' });

    const task = result.rows[0];
    const membership = await isMember(task.project_id, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Access denied.' });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/tasks/:id - update task
router.put('/:id', authenticate, async (req, res) => {
  const { title, description, status, priority, assigned_to, due_date } = req.body;
  try {
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (taskResult.rows.length === 0) return res.status(404).json({ message: 'Task not found.' });

    const task = taskResult.rows[0];
    const membership = await isMember(task.project_id, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Access denied.' });

    // Members can only update status of tasks assigned to them
    if (membership.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Members can only update their own assigned tasks.' });
    }

    const result = await pool.query(`
      UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assigned_to = COALESCE($5, assigned_to),
        due_date = COALESCE($6, due_date),
        updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [title, description, status, priority, assigned_to, due_date, req.params.id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (taskResult.rows.length === 0) return res.status(404).json({ message: 'Task not found.' });

    const task = taskResult.rows[0];
    const membership = await isMember(task.project_id, req.user.id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ message: 'Only project admins can delete tasks.' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
