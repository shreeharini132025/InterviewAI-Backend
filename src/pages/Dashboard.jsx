import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../api';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const typeColors = { hr: '#6366f1', technical: '#a855f7', behavioral: '#06b6d4' };
const typeIcons = { hr: '💼', technical: '⚙️', behavioral: '🎭' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(res => setStats(res.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-overlay" style={{ minHeight: '100vh', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '60px', height: '60px' }} />
      <p>Loading your dashboard...</p>
    </div>
  );

  const avgScore = parseFloat(stats?.avg_score || 0);
  const scoreColor = avgScore >= 75 ? 'var(--emerald)' : avgScore >= 50 ? 'var(--amber)' : 'var(--rose)';
  const scoreLabel = avgScore >= 75 ? 'Excellent' : avgScore >= 50 ? 'Good' : avgScore >= 30 ? 'Fair' : 'Needs Work';

  const weeklyData = stats?.weekly_progress?.length > 0 ? stats.weekly_progress : [
    { date: 'Mon', avg_score: 0, sessions: 0 }
  ];

  const typeData = stats?.score_by_type?.length > 0 ? stats.score_by_type.map(t => ({
    name: t.interview_type.toUpperCase(),
    score: parseFloat(t.avg_score || 0).toFixed(1),
    count: t.count,
    color: typeColors[t.interview_type]
  })) : [];

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>
              Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Track your interview performance and keep improving.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/interview')}>
            🎯 Start New Interview
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid-4" style={{ marginBottom: '32px' }}>
          {[
            { label: 'Total Sessions', value: stats?.total_sessions || 0, icon: '🎯', color: 'var(--indigo)', sub: 'interviews completed' },
            { label: 'Avg Score', value: `${avgScore}%`, icon: '📊', color: scoreColor, sub: scoreLabel },
            { label: 'Best Score', value: `${parseFloat(stats?.best_score || 0).toFixed(1)}%`, icon: '🏆', color: 'var(--amber)', sub: 'personal record' },
            { label: 'Types Practiced', value: stats?.score_by_type?.length || 0, icon: '💼', color: 'var(--cyan)', sub: 'of 3 types' }
          ].map(card => (
            <div key={card.label} className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{card.label}</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: card.color }}>{card.value}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{card.sub}</p>
                </div>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: `${card.color}20`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.4rem', border: `1px solid ${card.color}30`
                }}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid-2" style={{ marginBottom: '32px' }}>
          {/* Weekly Progress */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>📈 Weekly Progress</h3>
            {weeklyData.length > 0 && weeklyData[0].avg_score > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="avg_score" stroke="#6366f1" strokeWidth={2} fill="url(#scoreGrad)" name="Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📊</div>
                <p>Complete interviews to see progress</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => navigate('/interview')}>Start Now</button>
              </div>
            )}
          </div>

          {/* Score by Type */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>🎭 Performance by Type</h3>
            {typeData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {typeData.map(t => (
                  <div key={t.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {typeIcons[t.name.toLowerCase()]} {t.name}
                      </span>
                      <span style={{ fontWeight: 700, color: t.color }}>{t.score}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${t.score}%`, background: t.color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {['HR', 'TECHNICAL', 'BEHAVIORAL'].map((t, i) => (
                  <div key={t}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{typeIcons[t.toLowerCase()]} {t}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not practiced</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: '0%' }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Score Overview + Recent Sessions */}
        <div className="grid-2">
          {/* Score Gauge */}
          <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.1rem', alignSelf: 'flex-start' }}>🎯 Overall Performance</h3>
            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ value: avgScore, fill: scoreColor }]} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(99,102,241,0.1)' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: scoreColor }}>{avgScore.toFixed(0)}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <span style={{ padding: '6px 20px', borderRadius: '999px', background: `${scoreColor}22`, color: scoreColor, fontWeight: 600, fontSize: '0.9rem' }}>
                {scoreLabel}
              </span>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem' }}>🕐 Recent Sessions</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>View All</button>
            </div>
            {stats?.recent_sessions?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stats.recent_sessions.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'rgba(99,102,241,0.05)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'var(--transition)'
                  }} onClick={() => navigate(`/results/${s.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{typeIcons[s.interview_type]}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem', textTransform: 'capitalize' }}>{s.interview_type} Interview</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {new Date(s.completed_at || s.started_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: 700, fontSize: '1rem',
                        color: parseFloat(s.total_score) >= 70 ? 'var(--emerald)' : parseFloat(s.total_score) >= 50 ? 'var(--amber)' : 'var(--rose)'
                      }}>{parseFloat(s.total_score).toFixed(0)}%</div>
                      <div style={{
                        fontSize: '0.72rem', marginTop: '2px',
                        color: s.status === 'completed' ? 'var(--emerald)' : 'var(--amber)'
                      }}>{s.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
                <p>No sessions yet. Start your first interview!</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => navigate('/interview')}>
                  Practice Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
