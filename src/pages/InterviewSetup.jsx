import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startInterview, getQuestions, getQuestionsSummary } from '../api';
import Toast from '../components/Toast';

const INTERVIEW_TYPES = [
  {
    id: 'hr',
    title: 'HR Interview',
    icon: '💼',
    color: '#6366f1',
    description: 'Practice behavioral, motivational, and culture-fit questions asked by HR managers.',
    difficulty: 'Beginner Friendly',
    questions: 6
  },
  {
    id: 'technical',
    title: 'Technical Interview',
    icon: '⚙️',
    color: '#a855f7',
    description: 'Deep-dive into technical concepts, algorithms, system design, and problem-solving.',
    difficulty: 'Intermediate',
    questions: 6
  },
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    icon: '🎭',
    color: '#06b6d4',
    description: 'STAR method questions about teamwork, leadership, conflict resolution, and growth.',
    difficulty: 'All Levels',
    questions: 5
  }
];

export default function InterviewSetup() {
  const [selected, setSelected] = useState(null);
  const [difficulty, setDifficulty] = useState('all');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const [typeCounts, setTypeCounts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getQuestionsSummary();
        if (cancelled) return;
        setTypeCounts(res?.data?.summary || null);
      } catch (err) {
        // Non-blocking: cards will fall back to hardcoded placeholders
        console.warn('Failed to load question summary:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const typesWithMeta = useMemo(() => {
    return INTERVIEW_TYPES.map((t) => {
      const meta = typeCounts?.[t.id];
      const count = typeof meta?.count === 'number' ? meta.count : t.questions;
      return { ...t, questions: count };
    });
  }, [typeCounts]);

  const handleStart = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const qRes = await getQuestions(selected, {
        difficulty: difficulty !== 'all' ? difficulty : undefined,
        limit: 6
      });

      const qs = qRes?.data?.questions || [];
      if (qs.length === 0) {
        setToast({
          message: `No ${selected} questions found. Ask admin to add/import questions in Admin page.`,
          type: 'error',
        });
        return;
      }

      const sessionRes = await startInterview({ interview_type: selected });
      navigate('/interview/session', {
        state: {
          session_id: sessionRes.data.session_id,
          questions: qs,
          interview_type: selected
        }
      });
    } catch (err) {
      console.error('Failed to start:', err);
      setToast({ message: 'Failed to start interview. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="container">
        <div className="page-hero">
          <h1>Choose Your <span className="gradient-text">Interview Type</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Select the type of interview you want to practice and we'll generate real questions with AI feedback.</p>
        </div>

        {/* Interview Type Cards */}
        <div className="grid-3" style={{ marginBottom: '40px' }}>
          {typesWithMeta.map(type => (
            <div
              key={type.id}
              className="glass-card"
              onClick={() => setSelected(type.id)}
              style={{
                padding: '32px',
                cursor: 'pointer',
                border: selected === type.id ? `2px solid ${type.color}` : '1px solid var(--border)',
                boxShadow: selected === type.id ? `0 0 30px ${type.color}40` : '',
                transform: selected === type.id ? 'translateY(-4px) scale(1.02)' : '',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {selected === type.id && (
                <div style={{
                  position: 'absolute', top: '16px', right: '16px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: type.color, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.8rem'
                }}>✓</div>
              )}
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: `${type.color}22`, border: `1px solid ${type.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', marginBottom: '20px'
              }}>{type.icon}</div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{type.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.7 }}>{type.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>📝 {type.questions} Questions</span>
                <span style={{ color: type.color, fontSize: '0.8rem', fontWeight: 500 }}>{type.difficulty}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Options */}
        {selected && (
          <div className="glass-card" style={{ padding: '32px', marginBottom: '32px', animation: 'fadeInUp 0.4s ease' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>⚙️ Interview Settings</h3>
            <div>
              <label className="form-label">Difficulty Level</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['all', 'easy', 'medium', 'hard'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`btn ${difficulty === d ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {d === 'all' ? '🎲 All Levels' : d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Start Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn btn-primary btn-lg"
            disabled={!selected || loading}
            onClick={handleStart}
            style={{ minWidth: '260px', justifyContent: 'center' }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> Preparing Interview...</>
            ) : selected ? (
              `🚀 Start ${typesWithMeta.find(t => t.id === selected)?.title}`
            ) : (
              '← Select an Interview Type'
            )}
          </button>
          {selected && !loading && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '12px' }}>
              Your answers will be evaluated by AI with keyword matching and feedback.
            </p>
          )}
        </div>

        {/* Tips */}
        <div style={{ marginTop: '60px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { icon: '💡', tip: 'Use the STAR method', desc: 'Situation, Task, Action, Result — structure every behavioral answer this way.' },
            { icon: '🎯', tip: 'Include keywords', desc: 'AI scores your answers based on industry-relevant keywords. Be specific.' },
            { icon: '⏱️', tip: 'Mind the timer', desc: 'Each question has a time limit. Answer within the given time for full marks.' }
          ].map(t => (
            <div key={t.tip} style={{
              padding: '20px', background: 'rgba(99,102,241,0.05)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{t.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{t.tip}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
