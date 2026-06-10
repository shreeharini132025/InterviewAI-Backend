import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSession } from '../api';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

const typeIcons = { hr: '💼', technical: '⚙️', behavioral: '🎭' };

function ScoreRing({ score, color, label, size = 100 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="90%" data={[{ value: score, fill: color }]} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'rgba(255,255,255,0.05)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: size > 80 ? '1.4rem' : '1rem', fontWeight: 800, color }}>{Math.round(score)}</span>
        </div>
      </div>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

export default function Results() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!data);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!data) {
      getSession(id)
        .then(res => setData({ evaluation: res.data.evaluation, answers: res.data.answers, answers_count: res.data.answers?.length }))
        .catch(() => navigate('/history'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return (
    <div className="loading-overlay" style={{ minHeight: '100vh' }}>
      <div className="spinner" style={{ width: '60px', height: '60px' }} />
      <p>Generating your performance report...</p>
    </div>
  );

  const ev = data?.evaluation;
  if (!ev) return (
    <div className="page" style={{ textAlign: 'center' }}>
      <h2>No results found.</h2>
      <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/interview')}>
        Start New Interview
      </button>
    </div>
  );

  const overall = parseFloat(ev.overall_score || 0);
  const grade = overall >= 85 ? 'A+' : overall >= 75 ? 'A' : overall >= 65 ? 'B+' : overall >= 55 ? 'B' : overall >= 45 ? 'C' : 'D';
  const gradeColor = overall >= 75 ? 'var(--emerald)' : overall >= 55 ? 'var(--amber)' : 'var(--rose)';
  const gradeLabel = overall >= 85 ? 'Outstanding 🏆' : overall >= 75 ? 'Excellent 🌟' : overall >= 65 ? 'Good 👍' : overall >= 50 ? 'Average 📊' : 'Needs Practice 💪';

  let strengths = [], weaknesses = [], recommendations = [];
  try { strengths = JSON.parse(ev.strengths || '[]'); } catch {}
  try { weaknesses = JSON.parse(ev.weaknesses || '[]'); } catch {}
  try { recommendations = JSON.parse(ev.recommendations || '[]'); } catch {}

  const scoreMetrics = [
    { key: 'communication_score', label: 'Communication', color: '#6366f1' },
    { key: 'technical_score', label: 'Technical', color: '#a855f7' },
    { key: 'confidence_score', label: 'Confidence', color: '#06b6d4' },
    { key: 'clarity_score', label: 'Clarity', color: '#10b981' }
  ];

  return (
    <div className="page">
      <div className="container">
        {/* Hero Result */}
        <div style={{
          textAlign: 'center', marginBottom: '48px', padding: '60px 24px',
          background: 'var(--gradient-card)', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 50% 50%, ${gradeColor}10, transparent 70%)`,
            pointerEvents: 'none'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '140px', height: '140px', margin: '0 auto 24px',
              borderRadius: '50%', background: `${gradeColor}22`,
              border: `4px solid ${gradeColor}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 40px ${gradeColor}40`
            }}>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: gradeColor }}>{grade}</span>
            </div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
              Interview <span className="gradient-text">Complete!</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '24px' }}>{gradeLabel}</p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 32px', background: `${gradeColor}22`, borderRadius: '999px',
              border: `1px solid ${gradeColor}44`
            }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: gradeColor }}>{overall.toFixed(1)}%</span>
              <span style={{ color: 'var(--text-secondary)' }}>Overall Score</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-full)', padding: '4px', width: 'fit-content' }}>
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'scores', label: '🎯 Scores' },
            { id: 'answers', label: '💬 Answers' },
            { id: 'feedback', label: '🤖 AI Feedback' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn btn-sm"
              style={{
                background: activeTab === tab.id ? 'var(--gradient-main)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-full)'
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="grid-2" style={{ marginBottom: '32px' }}>
              {/* Score Rings */}
              <div className="glass-card" style={{ padding: '32px' }}>
                <h3 style={{ marginBottom: '28px', fontSize: '1.1rem' }}>📊 Performance Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', justifyItems: 'center' }}>
                  {scoreMetrics.map(m => (
                    <ScoreRing
                      key={m.key}
                      score={parseFloat(ev[m.key] || 0)}
                      color={m.color}
                      label={m.label}
                      size={100}
                    />
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--emerald)' }}>✅ Strengths</h3>
                  {strengths.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {strengths.map((s, i) => (
                        <li key={i} style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)', borderLeft: '3px solid var(--emerald)' }}>{s}</li>
                      ))}
                    </ul>
                  ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Complete more questions to see strengths.</p>}
                </div>
                <div>
                  <h3 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--rose)' }}>❌ Areas to Improve</h3>
                  {weaknesses.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {weaknesses.map((w, i) => (
                        <li key={i} style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)', borderLeft: '3px solid var(--rose)' }}>{w}</li>
                      ))}
                    </ul>
                  ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Great job! No major weaknesses detected.</p>}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="glass-card" style={{ padding: '32px', marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>💡 AI Recommendations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recommendations.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '14px', padding: '14px 18px',
                    background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>💡</span>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{r}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Scores */}
        {activeTab === 'scores' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="glass-card" style={{ padding: '32px', marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '28px', fontSize: '1.1rem' }}>🎯 Detailed Score Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { label: 'Overall Score', value: ev.overall_score, color: gradeColor, icon: '🏆' },
                  { label: 'Communication', value: ev.communication_score, color: '#6366f1', icon: '💬' },
                  { label: 'Technical Knowledge', value: ev.technical_score, color: '#a855f7', icon: '⚙️' },
                  { label: 'Confidence', value: ev.confidence_score, color: '#06b6d4', icon: '💪' },
                  { label: 'Clarity', value: ev.clarity_score, color: '#10b981', icon: '🎯' }
                ].map(metric => {
                  const val = parseFloat(metric.value || 0);
                  return (
                    <div key={metric.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span>{metric.icon}</span>
                          <span style={{ fontWeight: 500 }}>{metric.label}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: metric.color, fontSize: '1.1rem' }}>{val.toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: '10px' }}>
                        <div className="progress-fill" style={{ width: `${val}%`, background: metric.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Answers */}
        {activeTab === 'answers' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(data?.answers || []).map((ans, i) => {
              const s = parseFloat(ans.score || 0);
              const sc = s >= 70 ? 'var(--emerald)' : s >= 45 ? 'var(--amber)' : 'var(--rose)';
              let km = [];
              try { km = JSON.parse(ans.keywords_matched || '[]'); } catch {}
              return (
                <div key={ans.id} className="glass-card" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--gradient-main)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'white'
                      }}>{i + 1}</div>
                      <span className={`badge badge-${ans.difficulty === 'easy' ? 'emerald' : ans.difficulty === 'medium' ? 'amber' : 'rose'}`}>{ans.difficulty}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 800, color: sc }}>{s.toFixed(0)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/100</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ color: 'var(--indigo-light)', fontSize: '0.82rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question</p>
                    <p style={{ fontWeight: 500, lineHeight: 1.6 }}>{ans.question_text}</p>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Answer</p>
                    <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                      {ans.answer_text || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No answer provided</span>}
                    </div>
                  </div>
                  {km.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px' }}>Keywords Matched:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {km.map(k => <span key={k} className="badge badge-emerald">{k}</span>)}
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '12px 16px', background: `${sc}10`, borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${sc}` }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>{ans.feedback}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: AI Feedback */}
        {activeTab === 'feedback' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: 'var(--gradient-main)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.8rem'
                }}>🤖</div>
                <div>
                  <h2 style={{ fontSize: '1.3rem' }}>AI Interview Coach Feedback</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Personalized analysis of your performance</p>
                </div>
              </div>
              <div style={{
                padding: '24px', background: 'rgba(99,102,241,0.06)',
                borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                marginBottom: '24px', lineHeight: 1.9, color: 'var(--text-secondary)', fontSize: '1rem'
              }}>
                {ev.detailed_feedback || 'Complete more interviews to receive detailed AI feedback.'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[
                  { icon: '📈', title: 'Next Steps', tip: 'Practice daily with different question types to build consistency.' },
                  { icon: '🎯', title: 'Key Focus', tip: 'Use the STAR method (Situation, Task, Action, Result) for every behavioral answer.' },
                  { icon: '💪', title: 'Pro Tip', tip: 'Record yourself answering questions aloud to improve verbal fluency.' }
                ].map(tip => (
                  <div key={tip.title} style={{ padding: '20px', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>{tip.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>{tip.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>{tip.tip}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/interview')}>🔄 Practice Again</button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate('/dashboard')}>📊 View Dashboard</button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate('/history')}>📋 All Sessions</button>
        </div>
      </div>
    </div>
  );
}
