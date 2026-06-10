import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div className="spinner" style={{ width: '60px', height: '60px' }} />
      <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
