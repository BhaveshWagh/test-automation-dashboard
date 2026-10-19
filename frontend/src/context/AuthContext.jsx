import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  login as loginRequest,
  logout as logoutRequest,
  verifyEmail as verifyEmailRequest,
  refreshSession,
  getMe,
  setAccessToken
} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' while the silent-refresh bootstrap runs, then 'authenticated' or 'anonymous'.
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    refreshSession()
      .then(({ accessToken }) => {
        setAccessToken(accessToken);
        return getMe();
      })
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
        setStatus('anonymous');
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const { user: me, accessToken } = await loginRequest(email, password);
    setAccessToken(accessToken);
    setUser(me);
    setStatus('authenticated');
  }, []);

  // Confirms the emailed code; the server starts the session on success.
  const verifyEmail = useCallback(async (email, otp) => {
    const { user: me, accessToken } = await verifyEmailRequest(email, otp);
    setAccessToken(accessToken);
    setUser(me);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => {});
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  return <AuthContext.Provider value={{ user, status, login, verifyEmail, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
