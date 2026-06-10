import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, authLogout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">🧠</div>
          <span>InterviewAI</span>
        </Link>

        {user && (
          <div className="navbar-links">
            <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
            <Link to="/interview" className={isActive('/interview')}>Practice</Link>
            <Link to="/history" className={isActive('/history')}>History</Link>
          </div>
        )}

        <div className="navbar-actions">
          {user ? (
            <button onClick={handleLogout} className="btn btn-outline btn-sm">
              Sign Out
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
