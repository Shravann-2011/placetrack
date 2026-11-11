import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshSession, setAccessToken, setSessionExpiredHandler } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'

  const finishLogin = useCallback(({ user, accessToken }) => {
    setAccessToken(accessToken);
    setUser(user);
    setStatus('authenticated');
  }, []);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  // On page load: try to restore the session from the refresh-token cookie
  useEffect(() => {
    setSessionExpiredHandler(clear);
    refreshSession().then(finishLogin).catch(clear);
  }, [finishLogin, clear]);

  const value = useMemo(
    () => ({
      user,
      status,
      login: async (credentials) => finishLogin(await api('/auth/login', { method: 'POST', body: credentials })),
      register: async (details) => finishLogin(await api('/auth/register', { method: 'POST', body: details })),
      logout: async () => {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        clear();
      },
    }),
    [user, status, finishLogin, clear]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
