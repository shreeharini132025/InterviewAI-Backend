const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/dashboard/stats - User dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalSessions] = await db.query(
      'SELECT COUNT(*) as count FROM interview_sessions WHERE user_id = ? AND status = "completed"',
      [userId]
    );

    const [avgScore] = await db.query(
      'SELECT AVG(total_score) as avg FROM interview_sessions WHERE user_id = ? AND status = "completed"',
      [userId]
    );

    const [bestScore] = await db.query(
      'SELECT MAX(total_score) as best FROM interview_sessions WHERE user_id = ? AND status = "completed"',
      [userId]
    );

    const [recentSessions] = await db.query(
      `SELECT s.id, s.interview_type, s.total_score, s.completed_at, s.status
       FROM interview_sessions s WHERE s.user_id = ?
       ORDER BY s.started_at DESC LIMIT 5`,
      [userId]
    );

    const [scoreByType] = await db.query(
      `SELECT interview_type, AVG(total_score) as avg_score, COUNT(*) as count
       FROM interview_sessions WHERE user_id = ? AND status = "completed"
       GROUP BY interview_type`,
      [userId]
    );

    const [weeklyProgress] = await db.query(
      `SELECT DATE(started_at) as date, AVG(total_score) as avg_score, COUNT(*) as sessions
       FROM interview_sessions
       WHERE user_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(started_at) ORDER BY date`,
      [userId]
    );

    res.json({
      success: true,
      stats: {
        total_sessions: totalSessions[0].count,
        avg_score: parseFloat(avgScore[0].avg || 0).toFixed(1),
        best_score: parseFloat(bestScore[0].best || 0).toFixed(1),
        recent_sessions: recentSessions,
        score_by_type: scoreByType,
        weekly_progress: weeklyProgress
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

module.exports = router;
