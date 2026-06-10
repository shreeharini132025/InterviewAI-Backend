const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// GET /api/questions/summary - Get counts + sample questions per category (auth)
router.get('/summary', auth, async (req, res) => {
  try {
    const [counts] = await db.query(
      `SELECT category, COUNT(*) AS c
       FROM questions
       GROUP BY category`
    );

    const countByCategory = (counts || []).reduce((acc, row) => {
      acc[row.category] = Number(row.c || 0);
      return acc;
    }, {});

    const categories = ['hr', 'technical', 'behavioral'];
    const summary = categories.reduce((acc, cat) => {
      acc[cat] = { count: countByCategory[cat] ?? 0 };
      return acc;
    }, {});

    return res.json({ success: true, summary });
  } catch (err) {
    console.error('Questions summary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch questions summary.' });
  }
});

// GET /api/questions/:type - Get questions by category
router.get('/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const { difficulty, limit = 6 } = req.query;
    const validTypes = ['hr', 'technical', 'behavioral'];
    if (!validTypes.includes(type))
      return res.status(400).json({ success: false, message: 'Invalid interview type.' });

    let query = 'SELECT * FROM questions WHERE category = ?';
    const params = [type];

    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    query += ' ORDER BY RAND() LIMIT ?';
    params.push(parseInt(limit));

    const [questions] = await db.query(query, params);
    res.json({ success: true, questions });
  } catch (err) {
    console.error('Questions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch questions.' });
  }
});

// GET /api/questions - Get all questions (admin)
router.get('/', admin, async (req, res) => {
  try {
    const [questions] = await db.query('SELECT * FROM questions ORDER BY category, difficulty');
    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch questions.' });
  }
});

// POST /api/questions - Add a question (admin)
router.post('/', admin, async (req, res) => {
  try {
    const {
      category,
      difficulty = 'medium',
      question_text,
      expected_keywords = '',
      ideal_answer = '',
      time_limit = 120,
    } = req.body;

    if (!category || !question_text) {
      return res.status(400).json({ success: false, message: 'Category and question text are required.' });
    }

    const [result] = await db.query(
      `INSERT INTO questions (category, difficulty, question_text, expected_keywords, ideal_answer, time_limit)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [category, difficulty, question_text, expected_keywords, ideal_answer, time_limit]
    );

    res.status(201).json({ success: true, questionId: result.insertId });
  } catch (err) {
    console.error('Add question error:', err);
    res.status(500).json({ success: false, message: 'Failed to add question.' });
  }
});

// PUT /api/questions/:id - Update a question (admin)
router.put('/:id', admin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      difficulty = 'medium',
      question_text,
      expected_keywords = '',
      ideal_answer = '',
      time_limit = 120,
    } = req.body;

    if (!category || !question_text) {
      return res.status(400).json({ success: false, message: 'Category and question text are required.' });
    }

    const [result] = await db.query(
      `UPDATE questions
       SET category = ?, difficulty = ?, question_text = ?, expected_keywords = ?, ideal_answer = ?, time_limit = ?
       WHERE id = ?`,
      [category, difficulty, question_text, expected_keywords, ideal_answer, time_limit, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update question error:', err);
    res.status(500).json({ success: false, message: 'Failed to update question.' });
  }
});

// DELETE /api/questions/:id - Delete a question (admin)
router.delete('/:id', admin, async (req, res) => {
  try {
    const { id } = req.params;
    const [refs] = await db.query('SELECT COUNT(*) AS c FROM answers WHERE question_id = ?', [id]);
    const refCount = refs?.[0]?.c ?? 0;

    if (refCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'This question has existing interview answers and cannot be deleted.',
      });
    }

    const [result] = await db.query('DELETE FROM questions WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete question.' });
  }
});

module.exports = router;
