import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions } from '../api';

const typeIcons = { hr: '💼', technical: '⚙️', behavioral: '🎭' };
const typeColors = { hr: 'var(--indigo)', technical: 'var(--purple)', behavioral: 'var(--cyan)' };

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    getSessions()
      .then(res => setSessions(res.data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.interview_type === filter);

  if (loading) return (
    <div className="loading-overlay" style={{ minHeight: '100vh' }}>
      <div className="spinner" style={{ width: '60px', height: '60px' }} />
      <p>Loading your history...</p>
    </div>
  );

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>Interview <span className="gradient-text">History</span></h1>
            <p style={{ color: 'var(--text-secondary)' }}>Review all your past interview sessions and progress.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/interview')}>🎯 New Interview</button>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Types', icon: '📋' },
            { id: 'hr', label: 'HR', icon: '💼' },
            { id: 'technical', label: 'Technical', icon: '⚙️' },
            { id: 'behavioral', label: 'Behavioral', icon: '🎭' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`btn btn-sm ${filter === f.id ? 'btn-primary' : 'btn-outline'}`}
            >
              {f.icon} {f.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem', alignSelf: 'center' }}>
            {filtered.length} session{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Summary Stats */}
        {sessions.length > 0 && (
          <div className="grid-4" style={{ marginBottom: '32px' }}>
            {[
              { label: 'Total Sessions', value: sessions.length, icon: '🎯' },
              { label: 'Completed', value: sessions.filter(s => s.status === 'completed').length, icon: '✅' },
              { label: 'Avg Score', value: `${(sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + parseFloat(s.total_score || 0), 0) / Math.max(1, sessions.filter(s => s.status === 'completed').length)).toFixed(1)}%`, icon: '📊' },
              { label: 'Best Score', value: `${Math.max(0, ...sessions.map(s => parseFloat(s.total_score || 0))).toFixed(1)}%`, icon: '🏆' }
            ].map(card => (
              <div key={card.label} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{card.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{card.value}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Sessions List */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📋</div>
            <h3 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>No sessions yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>Start your first interview to see your history here.</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/interview')}>
              🎯 Start First Interview
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filtered.map(s => {
              const score = parseFloat(s.total_score || s.eval_score || 0);
              const sc = score >= 70 ? 'var(--emerald)' : score >= 50 ? 'var(--amber)' : 'var(--rose)';
              const date = new Date(s.completed_at || s.started_at);
              return (
                <div
                  key={s.id}
                  className="glass-card"
                  style={{ padding: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px' }}
                  onClick={() => s.status === 'completed' && navigate(`/results/${s.id}`)}
                >
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '18px',
                    background: `${typeColors[s.interview_type]}22`,
                    border: `1px solid ${typeColors[s.interview_type]}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', flexShrink: 0
                  }}>{typeIcons[s.interview_type]}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '1rem', textTransform: 'capitalize' }}>{s.interview_type} Interview</h3>
                      <span style={{
                        padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem',
                        fontWeight: 600, textTransform: 'uppercase',
                        background: s.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: s.status === 'completed' ? 'var(--emerald)' : 'var(--amber)'
                      }}>{s.status}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} &nbsp;·&nbsp;
                      {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {s.status === 'completed' ? (
                      <>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: sc, lineHeight: 1 }}>{score.toFixed(0)}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/ 100</div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--amber)', fontSize: '0.85rem' }}>Incomplete</div>
                    )}
                  </div>

                  {s.status === 'completed' && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
