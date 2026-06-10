import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sip_token');
    const savedUser = localStorage.getItem('sip_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      getMe()
        .then(res => setUser(res.data.user))
        .catch(() => { localStorage.removeItem('sip_token'); localStorage.removeItem('sip_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const authLogin = (token, userData) => {
    localStorage.setItem('sip_token', token);
    localStorage.setItem('sip_user', JSON.stringify(userData));
    setUser(userData);
  };

  const authLogout = () => {
    localStorage.removeItem('sip_token');
    localStorage.removeItem('sip_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, authLogin, authLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
