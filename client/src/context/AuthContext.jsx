import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { getToken, setToken } from '../api/axios.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Where each role lands after login.
export const homeFor = (role) => ({ User: '/dashboard', Responder: '/responder', Admin: '/admin' }[role] || '/login');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken()); // true while we verify a saved token

  // On first load: if a token is saved, ask the server who we are.
  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setToken(null)) // expired or invalid token -> forget it
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = useCallback((data) => {
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = async (email, password) => handleAuth((await api.post('/auth/login', { email, password })).data);
  const register = async (form) => handleAuth((await api.post('/auth/register', form)).data);
  const logout = () => { setToken(null); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
