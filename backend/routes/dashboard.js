const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard - summary stats for logged-in user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const totalProjects = await pool.query(
      `SELECT COUNT(*) FROM project_members WHERE user_id = $1`, [userId]
    );

    const taskStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE t.status = 'todo') as todo,
        COUNT(*) FILTER (WHERE t.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE t.status = 'overdue' OR (t.due_date < NOW() AND t.status != 'completed')) as overdue
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id
      WHERE pm.user_id = $1
    `, [userId]);

    const myTasks = await pool.query(`
      SELECT t.*, p.name as project_name, u.name as assigned_to_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.assigned_to = $1 AND t.status != 'completed'
      ORDER BY t.due_date ASC NULLS LAST
      LIMIT 5
    `, [userId]);

    const recentTasks = await pool.query(`
      SELECT t.*, p.name as project_name, u.name as assigned_to_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
      LEFT JOIN users u ON t.assigned_to = u.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [userId]);

    res.json({
      total_projects: parseInt(totalProjects.rows[0].count),
      task_stats: taskStats.rows[0],
      my_tasks: myTasks.rows,
      recent_tasks: recentTasks.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
