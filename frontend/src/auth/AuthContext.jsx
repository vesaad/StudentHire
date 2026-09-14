import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);
const tokenKey = 'studenthire.token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function logout() {
    sessionStorage.removeItem(tokenKey);
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  }
  function acceptSession(session) {
    sessionStorage.setItem(tokenKey, session.token);
    api.defaults.headers.common.Authorization = `Bearer ${session.token}`;
    setUser(session.user);
    setError(false);
  }
  async function restoreSession() {
    setLoading(true);
    setError(false);
    const token = sessionStorage.getItem(tokenKey);
    if (!token) {
      setLoading(false);
      return;
    }
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) logout();
      else setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!user) return;
    let lastActivity = Date.now();
    let pending = false;
    let lastAttempt = 0;
    let disposed = false;
    async function renewIfNeeded() {
      if (pending || document.visibilityState !== 'visible' || Date.now() - lastActivity > 60000) return;
      const token = sessionStorage.getItem(tokenKey);
      if (!token) return;
      let expiresAt;
      try {
        expiresAt = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000;
      } catch { return; }
      if (expiresAt - Date.now() > 5 * 60000) return;
      if (Date.now() - lastAttempt < 30000) return;
      lastAttempt = Date.now();
      pending = true;
      try {
        const { data } = await api.post('/auth/renew');
        if (!disposed && sessionStorage.getItem(tokenKey) === token) {
          acceptSession(data.data);
        }
      } catch {
        // Authentication failures are handled by the response interceptor.
        // Temporary network failures can retry while the current token is valid.
      } finally { pending = false; }
    }
    function active() {
      lastActivity = Date.now();
      renewIfNeeded();
    }
    const events = ['pointerdown', 'keydown', 'scroll', 'pointermove'];
    events.forEach((event) => window.addEventListener(event, active, { passive: true }));
    document.addEventListener('visibilitychange', active);
    const timer = setInterval(renewIfNeeded, 30000);
    renewIfNeeded();
    return () => {
      disposed = true;
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, active));
      document.removeEventListener('visibilitychange', active);
    };
  }, [user?.id]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 401 ||
          error.response?.data?.error?.code === 'ACCOUNT_SUSPENDED'
        )
          logout();
        return Promise.reject(error);
      },
    );
    restoreSession();
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, acceptSession, logout, restoreSession }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
