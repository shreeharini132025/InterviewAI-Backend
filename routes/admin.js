const express = require('express');
const router = express.Router();
const db = require('../config/db');
const admin = require('../middleware/admin');

// GET /api/admin/users - User management (admin)
router.get('/users', admin, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const like = `%${q}%`;

    const [[{ totalUsers }]] = await db.query(
      `SELECT COUNT(*) AS totalUsers
       FROM users
       WHERE role = 'candidate'`
    );

    const [[{ activeSessions }]] = await db.query(
      `SELECT COUNT(*) AS activeSessions
       FROM interview_sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE u.role = 'candidate' AND s.status = 'in_progress'`
    );

    const [[{ avgInterviewScore }]] = await db.query(
      `SELECT ROUND(AVG(e.overall_score), 2) AS avgInterviewScore
       FROM evaluations e
       INNER JOIN interview_sessions s ON s.id = e.session_id
       INNER JOIN users u ON u.id = s.user_id
       WHERE u.role = 'candidate'`
    );

    const [rows] = await db.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         u.created_at,
         COUNT(DISTINCT s.id) AS interviews,
         ROUND(COALESCE(AVG(e.overall_score), 0), 2) AS avg_score,
         SUM(CASE WHEN s.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_sessions,
         MAX(s.started_at) AS last_started_at
       FROM users u
       LEFT JOIN interview_sessions s ON s.user_id = u.id
       LEFT JOIN evaluations e ON e.session_id = s.id
       WHERE u.role = 'candidate'
         AND (? = '' OR u.name LIKE ? OR u.email LIKE ?)
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [q, like, like]
    );

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const users = rows.map((r) => {
      const last = r.last_started_at ? new Date(r.last_started_at).getTime() : null;
      const active = r.in_progress_sessions > 0 || (last !== null && now - last <= THIRTY_DAYS_MS);
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        status: active ? 'active' : 'inactive',
        interviews: Number(r.interviews || 0),
        avgScore: Number(r.avg_score || 0),
      };
    });

    res.json({
      success: true,
      stats: {
        totalUsers: Number(totalUsers || 0),
        activeSessions: Number(activeSessions || 0),
        premiumUsers: 0,
        avgInterviewScore: Number(avgInterviewScore || 0),
      },
      users,
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// DELETE /api/admin/users/:id - Delete a candidate user (admin)
router.delete('/users/:id', admin, async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }

    if (req.user?.id && Number(req.user.id) === userId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    const [rows] = await db.query('SELECT id, role, email, name FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const target = rows[0];
    if (target.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Only candidate users can be deleted.' });
    }

    const [result] = await db.query("DELETE FROM users WHERE id = ? AND role = 'candidate'", [userId]);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: 'User deleted successfully.',
      deletedUser: { id: target.id, email: target.email, name: target.name },
    });
  } catch (err) {
    console.error('Admin delete user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

module.exports = router;
