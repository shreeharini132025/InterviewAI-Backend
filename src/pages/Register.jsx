import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password)
      return setToast({ message: 'All fields required!', type: 'error' });
    if (form.password.length < 6)
      return setToast({ message: 'Password must be at least 6 characters.', type: 'error' });
    setLoading(true);
    try {
      const res = await register(form);
      authLogin(res.data.token, res.data.user);
      setToast({ message: 'Account created! Welcome aboard 🎉', type: 'success' });
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Registration failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px', height: '64px', background: 'var(--gradient-main)',
            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 16px', boxShadow: 'var(--shadow-glow)'
          }}>🧠</div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Start your AI interview practice journey</p>
        </div>

        <div className="glass-card" style={{ padding: '40px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Full Name</label>
              <input
                className="input-field"
                id="register-name"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Email Address</label>
              <input
                className="input-field"
                id="register-email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: '28px' }}>
              <label className="form-label">Password</label>
              <input
                className="input-field"
                id="register-password"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={loading} type="submit">
              {loading ? <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Creating...</> : 'Create Account →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--indigo-light)', fontWeight: 500 }}>Login</Link>
          </div>
        </div>

        {/* Features list */}
        <div style={{ marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['✅ Free Forever', '🤖 AI Feedback', '🎤 Voice Mode'].map(f => (
            <span key={f} style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
