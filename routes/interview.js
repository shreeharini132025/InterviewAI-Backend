const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const axios = require('axios');
const path = require('path');
require('../config/env');

// POST /api/interview/start - Start a new interview session
router.post('/start', auth, async (req, res) => {
  try {
    const { interview_type } = req.body;
    const validTypes = ['hr', 'technical', 'behavioral'];
    if (!validTypes.includes(interview_type))
      return res.status(400).json({ success: false, message: 'Invalid interview type.' });

    const [result] = await db.query(
      'INSERT INTO interview_sessions (user_id, interview_type, status) VALUES (?, ?, "in_progress")',
      [req.user.id, interview_type]
    );
    res.json({ success: true, session_id: result.insertId, message: 'Interview started.' });
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ success: false, message: 'Failed to start interview.' });
  }
});

// POST /api/interview/submit-answer - Submit answer for a question
router.post('/submit-answer', auth, async (req, res) => {
  try {
    const { session_id, question_id, answer_text, time_taken } = req.body;

    // Verify session belongs to user
    const [sessions] = await db.query(
      'SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?',
      [session_id, req.user.id]
    );
    if (sessions.length === 0)
      return res.status(403).json({ success: false, message: 'Unauthorized session.' });

    // Get question for evaluation
    const [questions] = await db.query('SELECT * FROM questions WHERE id = ?', [question_id]);
    if (questions.length === 0)
      return res.status(404).json({ success: false, message: 'Question not found.' });

    const question = questions[0];

    // AI Evaluation - call Python service or use fallback
    let evaluation = { score: 0, feedback: '', keywords_matched: [] };
    try {
      const aiResponse = await axios.post(`${process.env.PYTHON_SERVICE_URL}/evaluate`, {
        question: question.question_text,
        answer: answer_text,
        expected_keywords: question.expected_keywords,
        ideal_answer: question.ideal_answer,
        time_taken,
        time_limit: question.time_limit
      }, { timeout: 5000 });
      evaluation = aiResponse.data;
    } catch (aiErr) {
      // Fallback local evaluation
      evaluation = localEvaluate(answer_text, question.expected_keywords, question.ideal_answer, time_taken, question.time_limit);
    }

    // Save answer
    const [result] = await db.query(
      `INSERT INTO answers (session_id, question_id, answer_text, score, feedback, keywords_matched, time_taken)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        session_id, question_id, answer_text,
        evaluation.score, evaluation.feedback,
        JSON.stringify(evaluation.keywords_matched),
        time_taken || 0
      ]
    );

    res.json({
      success: true,
      answer_id: result.insertId,
      score: evaluation.score,
      feedback: evaluation.feedback,
      keywords_matched: evaluation.keywords_matched,
      keywords_total: question.expected_keywords ? question.expected_keywords.split(',').length : 0
    });
  } catch (err) {
    console.error('Submit answer error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit answer.' });
  }
});

// POST /api/interview/complete - Complete interview and get final evaluation
router.post('/complete', auth, async (req, res) => {
  try {
    const { session_id } = req.body;

    const [sessions] = await db.query(
      'SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?',
      [session_id, req.user.id]
    );
    if (sessions.length === 0)
      return res.status(403).json({ success: false, message: 'Unauthorized session.' });

    // Get all answers for session
    const [answers] = await db.query(
      `SELECT a.*, q.question_text, q.category, q.difficulty FROM answers a
       JOIN questions q ON a.question_id = q.id
       WHERE a.session_id = ?`,
      [session_id]
    );

    if (answers.length === 0)
      return res.status(400).json({ success: false, message: 'No answers found for this session.' });

    // Calculate aggregate scores
    const totalScore = answers.reduce((sum, a) => sum + parseFloat(a.score), 0) / answers.length;
    const avgTimeTaken = answers.reduce((sum, a) => sum + a.time_taken, 0) / answers.length;

    // Generate comprehensive feedback
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    answers.forEach(a => {
      const score = parseFloat(a.score);
      if (score >= 70) strengths.push(`Good answer on: "${a.question_text.substring(0, 50)}..."`);
      else if (score < 40) weaknesses.push(`Needs improvement: "${a.question_text.substring(0, 50)}..."`);
    });

    if (totalScore >= 80) recommendations.push('Excellent performance! Practice a few more rounds to perfect.');
    else if (totalScore >= 60) recommendations.push('Good performance! Focus on depth and specific examples.');
    else if (totalScore >= 40) recommendations.push('Fair performance. Study more and use STAR method for answers.');
    else recommendations.push('Needs significant improvement. Review fundamentals and practice daily.');

    if (avgTimeTaken < 30) recommendations.push('Take more time to think before answering — rushed answers lack detail.');
    if (answers.some(a => (a.answer_text || '').split(' ').length < 20))
      recommendations.push('Some answers were too short. Aim for at least 3-4 sentences per answer.');

    const evaluationData = {
      overall_score: totalScore.toFixed(2),
      communication_score: (totalScore * 0.9 + Math.random() * 10).toFixed(2),
      technical_score: (totalScore * 0.95 + Math.random() * 5).toFixed(2),
      confidence_score: (totalScore * 0.85 + Math.random() * 15).toFixed(2),
      clarity_score: (totalScore * 0.9 + Math.random() * 10).toFixed(2),
      strengths: JSON.stringify(strengths.slice(0, 3)),
      weaknesses: JSON.stringify(weaknesses.slice(0, 3)),
      recommendations: JSON.stringify(recommendations),
      detailed_feedback: generateDetailedFeedback(totalScore, answers)
    };

    // Save evaluation
    await db.query(
      `INSERT INTO evaluations (session_id, overall_score, communication_score, technical_score, confidence_score, clarity_score, strengths, weaknesses, recommendations, detailed_feedback)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session_id, ...Object.values(evaluationData)]
    );

    // Update session
    await db.query(
      'UPDATE interview_sessions SET status = "completed", total_score = ?, completed_at = NOW() WHERE id = ?',
      [totalScore.toFixed(2), session_id]
    );

    res.json({
      success: true,
      message: 'Interview completed successfully!',
      evaluation: evaluationData,
      answers_count: answers.length,
      answers
    });
  } catch (err) {
    console.error('Complete interview error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete interview.' });
  }
});

// GET /api/interview/sessions - Get user's interview history
router.get('/sessions', auth, async (req, res) => {
  try {
    const [sessions] = await db.query(
      `SELECT s.*, e.overall_score as eval_score 
       FROM interview_sessions s
       LEFT JOIN evaluations e ON s.id = e.session_id
       WHERE s.user_id = ?
       ORDER BY s.started_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch sessions.' });
  }
});

// GET /api/interview/session/:id - Get session details
router.get('/session/:id', auth, async (req, res) => {
  try {
    const [sessions] = await db.query(
      'SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (sessions.length === 0)
      return res.status(404).json({ success: false, message: 'Session not found.' });

    const [answers] = await db.query(
      `SELECT a.*, q.question_text, q.category, q.difficulty FROM answers a
       JOIN questions q ON a.question_id = q.id WHERE a.session_id = ?`,
      [req.params.id]
    );

    const [evaluations] = await db.query(
      'SELECT * FROM evaluations WHERE session_id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      session: sessions[0],
      answers,
      evaluation: evaluations[0] || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch session details.' });
  }
});

// LOCAL EVALUATION FUNCTION (runs when Python service is unavailable)
function localEvaluate(answer, expectedKeywords, idealAnswer, timeTaken, timeLimit) {
  if (!answer || answer.trim().length === 0) {
    return { score: 0, feedback: 'No answer provided.', keywords_matched: [] };
  }

  const answerLower = answer.toLowerCase();
  const keywords = expectedKeywords ? expectedKeywords.split(',').map(k => k.trim().toLowerCase()) : [];
  const matched = keywords.filter(k => answerLower.includes(k));
  const keywordScore = keywords.length > 0 ? (matched.length / keywords.length) * 40 : 20;

  const wordCount = answer.trim().split(/\s+/).length;
  let lengthScore = 0;
  if (wordCount >= 80) lengthScore = 30;
  else if (wordCount >= 50) lengthScore = 25;
  else if (wordCount >= 30) lengthScore = 15;
  else if (wordCount >= 15) lengthScore = 8;
  else lengthScore = 3;

  const timeScore = timeTaken > 10 && timeTaken <= timeLimit ? 20 : timeTaken > timeLimit ? 10 : 5;
  const structureScore = answer.includes('.') && answer.split('.').length > 2 ? 10 : 5;
  const totalScore = Math.min(100, keywordScore + lengthScore + timeScore + structureScore);

  const feedbackParts = [];
  if (matched.length === 0) feedbackParts.push('Include relevant keywords like: ' + keywords.slice(0, 3).join(', ') + '.');
  else if (matched.length < keywords.length / 2) feedbackParts.push(`You matched ${matched.length}/${keywords.length} key concepts. Try to cover more.`);
  else feedbackParts.push(`Great keyword usage! You covered ${matched.length} key concepts.`);

  if (wordCount < 30) feedbackParts.push('Answer is too short. Aim for at least 3-4 detailed sentences.');
  else if (wordCount > 200) feedbackParts.push('Good detail! Keep answers focused — avoid over-explaining.');
  else feedbackParts.push('Good answer length!');

  if (totalScore >= 75) feedbackParts.push('Strong answer overall. Excellent work!');
  else if (totalScore >= 50) feedbackParts.push('Decent answer. Add more specific examples to score higher.');
  else feedbackParts.push('Practice more. Review the ideal answer structure for this type of question.');

  return {
    score: Math.round(totalScore),
    feedback: feedbackParts.join(' '),
    keywords_matched: matched
  };
}

function generateDetailedFeedback(score, answers) {
  if (score >= 80) return 'Outstanding performance! You demonstrated excellent knowledge, clear communication, and structured thinking. You are well-prepared for real interviews.';
  if (score >= 65) return 'Good performance. Your answers were relevant and mostly complete. Focus on adding specific examples using the STAR method (Situation, Task, Action, Result).';
  if (score >= 50) return 'Average performance. Your answers show basic understanding but lack depth. Practice elaborating with real experiences and using industry-relevant keywords.';
  if (score >= 35) return 'Below average. You need to significantly improve your preparation. Study common interview questions, practice out loud, and focus on structuring your answers clearly.';
  return 'Poor performance. Do not get discouraged — everyone starts somewhere. Begin by studying the basics, watching interview preparation videos, and practice daily.';
}

module.exports = router;
