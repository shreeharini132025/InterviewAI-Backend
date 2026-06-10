import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { submitAnswer, completeInterview } from '../api';
import Toast from '../components/Toast';

const DIFF_COLORS = { easy: 'var(--emerald)', medium: 'var(--amber)', hard: 'var(--rose)' };

function CountdownTimer({ seconds, total, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);
  const timerRef = useRef(null);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    timerRef.current = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [remaining, onExpire]);

  const pct = (remaining / total) * 100;
  const color = remaining > total * 0.5 ? 'var(--emerald)' : remaining > total * 0.2 ? 'var(--amber)' : 'var(--rose)';
  const circumference = 2 * Math.PI * 45;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="45" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="8" />
        <circle
          cx="55" cy="55" r="45" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
        />
        <text x="55" y="52" textAnchor="middle" fill={color} fontSize="18" fontWeight="800" fontFamily="Inter">
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
        </text>
        <text x="55" y="68" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Inter">seconds</text>
      </svg>
    </div>
  );
}

export default function InterviewSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session_id, questions = [], interview_type } = location.state || {};

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answerMode, setAnswerMode] = useState('text'); // 'text' | 'voice'
  const [submitting, setSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [answeredIds, setAnsweredIds] = useState([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [timerKey, setTimerKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [completing, setCompleting] = useState(false);
  const recognitionRef = useRef(null);

  const currentQ = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const isAnswered = answeredIds.includes(currentQ?.id);
  const progress = ((currentIdx) / questions.length) * 100;

  useEffect(() => {
    if (!session_id || questions.length === 0) {
      navigate('/interview');
    }
    setStartTime(Date.now());
  }, [currentIdx]);

  // Voice recognition setup
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setToast({ message: 'Voice not supported in your browser. Use Chrome.', type: 'error' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setAnswer(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      setToast({ message: 'Please write or speak your answer before submitting.', type: 'error' });
      return;
    }
    if (isAnswered) return;

    setSubmitting(true);
    stopListening();
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    try {
      const res = await submitAnswer({
        session_id,
        question_id: currentQ.id,
        answer_text: answer,
        time_taken: timeTaken
      });
      setLastFeedback(res.data);
      setAnsweredIds(prev => [...prev, currentQ.id]);
    } catch (err) {
      setToast({ message: 'Failed to submit answer. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (isLast) {
      setCompleting(true);
      try {
        const res = await completeInterview({ session_id });
        navigate(`/results/${session_id}`, { state: { result: res.data } });
      } catch (err) {
        setToast({ message: 'Failed to complete interview.', type: 'error' });
        setCompleting(false);
      }
    } else {
      setCurrentIdx(prev => prev + 1);
      setAnswer('');
      setLastFeedback(null);
      setTimerKey(k => k + 1);
      setStartTime(Date.now());
    }
  };

  const handleExpire = useCallback(() => {
    if (!isAnswered && answer.trim().length > 0) handleSubmit();
    else if (!isAnswered) setToast({ message: "Time's up! Moving to next question.", type: 'info' });
  }, [isAnswered, answer]);

  if (!currentQ) return null;

  return (
    <div style={{ minHeight: '100vh', padding: '90px 24px 40px' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Top Progress Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>
                {interview_type === 'hr' ? '💼' : interview_type === 'technical' ? '⚙️' : '🎭'}
              </span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{interview_type} Interview</span>
              <span className={`badge badge-${currentQ.difficulty === 'easy' ? 'emerald' : currentQ.difficulty === 'medium' ? 'amber' : 'rose'}`}>
                {currentQ.difficulty}
              </span>
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
              {currentIdx + 1} / {questions.length}
            </span>
          </div>
          <div className="progress-bar" style={{ height: '6px' }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question Card + Timer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ color: 'var(--indigo-light)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
              Question {currentIdx + 1}
            </div>
            <h2 style={{ fontSize: '1.3rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              {currentQ.question_text}
            </h2>
          </div>
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Left</div>
            <CountdownTimer
              key={timerKey}
              seconds={currentQ.time_limit || 120}
              total={currentQ.time_limit || 120}
              onExpire={handleExpire}
            />
          </div>
        </div>

        {/* Answer Mode Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button className={`btn btn-sm ${answerMode === 'text' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setAnswerMode('text'); stopListening(); }}>
            ✍️ Type Answer
          </button>
          <button className={`btn btn-sm ${answerMode === 'voice' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAnswerMode('voice')}>
            🎤 Voice Answer
          </button>
        </div>

        {/* Answer Area */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
          {answerMode === 'text' ? (
            <textarea
              className="input-field"
              id="answer-textarea"
              rows={6}
              placeholder="Type your detailed answer here. Use specific examples, keywords, and structure your thoughts clearly..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              disabled={isAnswered}
              style={{ resize: 'vertical', minHeight: '160px', fontFamily: 'Inter, sans-serif' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ minHeight: '120px', padding: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', color: answer ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: answer ? 'normal' : 'italic', lineHeight: 1.7 }}>
                {answer || 'Your spoken words will appear here...'}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {!isListening ? (
                  <button className="btn btn-primary" onClick={startListening} disabled={isAnswered}>
                    🎤 Start Speaking
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={stopListening}>
                    <span style={{ animation: 'pulse-glow 1s infinite' }}>⏹</span> Stop Recording
                  </button>
                )}
                {isListening && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rose)', fontSize: '0.85rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--rose)', animation: 'pulse-glow 1s infinite' }} />
                    Listening...
                  </div>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {answer.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <span style={{ color: answer.length > 50 ? 'var(--emerald)' : 'var(--amber)', fontSize: '0.8rem' }}>
              {answer.length > 50 ? '✅ Good length' : '⚠️ Add more detail'}
            </span>
          </div>
        </div>

        {/* AI Feedback Panel */}
        {lastFeedback && (
          <div className="glass-card" style={{
            padding: '24px', marginBottom: '20px',
            border: '1px solid rgba(16,185,129,0.3)',
            background: 'rgba(16,185,129,0.05)',
            animation: 'fadeInUp 0.4s ease'
          }}>
            <h3 style={{ color: 'var(--emerald)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🤖 AI Feedback
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>Score</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: lastFeedback.score >= 70 ? 'var(--emerald)' : lastFeedback.score >= 45 ? 'var(--amber)' : 'var(--rose)' }}>
                  {lastFeedback.score}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
                  Keywords Matched ({lastFeedback.keywords_matched?.length || 0}/{lastFeedback.keywords_total || 0})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(lastFeedback.keywords_matched || []).slice(0, 6).map(k => (
                    <span key={k} className="badge badge-emerald">{k}</span>
                  ))}
                  {(lastFeedback.keywords_matched?.length || 0) === 0 && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No keywords matched</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: '14px', borderLeft: '3px solid var(--emerald)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feedback</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{lastFeedback.feedback}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {!isAnswered ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={submitting || !answer.trim()}
              style={{ minWidth: '180px', justifyContent: 'center' }}
            >
              {submitting ? (
                <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Analyzing...</>
              ) : '🤖 Submit & Analyze'}
            </button>
          ) : (
            <button
              className="btn btn-success btn-lg"
              onClick={handleNext}
              disabled={completing}
              style={{ minWidth: '200px', justifyContent: 'center' }}
            >
              {completing ? (
                <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Generating Report...</>
              ) : isLast ? '🏆 Finish & See Results' : 'Next Question →'}
            </button>
          )}
        </div>

        {/* Question Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '32px', justifyContent: 'center' }}>
          {questions.map((q, i) => (
            <div key={q.id} style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: i === currentIdx ? 'var(--gradient-main)' : answeredIds.includes(q.id) ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.1)',
              border: i === currentIdx ? 'none' : `1px solid ${answeredIds.includes(q.id) ? 'var(--emerald)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 600,
              color: i === currentIdx ? 'white' : answeredIds.includes(q.id) ? 'var(--emerald)' : 'var(--text-muted)',
              cursor: 'default'
            }}>
              {answeredIds.includes(q.id) ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
