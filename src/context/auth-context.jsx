import PropTypes from 'prop-types';
import { useMemo, useState, useEffect, useContext, createContext } from 'react';

const TOKEN_KEY = 'garbhotsav_admin_token';
const ADMIN_KEY = 'garbhotsav_admin_info';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [admin, setAdmin] = useState(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (admin) {
      sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    } else {
      sessionStorage.removeItem(ADMIN_KEY);
    }
  }, [admin]);

  const value = useMemo(
    () => ({
      token,
      admin,
      isAuthenticated: Boolean(token),
      setSession(nextToken, nextAdmin) {
        setToken(nextToken || '');
        setAdmin(nextAdmin || null);
      },
      logout() {
        setToken('');
        setAdmin(null);
      },
    }),
    [admin, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node,
};

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
