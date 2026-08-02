import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [subscription, setSubscription] = useState({ subscribed: false, days_remaining: 0 });
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    fetchSubscription(true); // show spinner on initial load

    // Poll every 3 seconds — keeps admin-side changes (modal toggle, override,
    // granted subscriptions) near-instant on the user side without requiring
    // a refresh or re-login. Lightweight: one small authenticated GET per 3s.
    const interval = setInterval(() => fetchSubscription(false), 3_000);

    // Also re-fetch immediately when the user switches back to this tab
    // or focuses the window — catches admin changes made while tab was hidden.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchSubscription(false);
    };
    const handleFocus = () => fetchSubscription(false);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token]);

  const fetchSubscription = async (showLoading = false) => {
    if (!localStorage.getItem('token')) return;
    // Only show the loading spinner on the initial fetch, not background polls
    if (showLoading) setSubLoading(true);
    try {
      const data = await api.subscribe.status();
      setSubscription(data);
    } catch (err) {
      // 401 = token expired or invalid — log the user out cleanly
      if (err.message?.toLowerCase().includes('401') || err.message?.toLowerCase().includes('authentication') || err.message?.toLowerCase().includes('invalid or expired')) {
        logout();
        return;
      }
      // Network / server error — preserve existing subscription state
      setSubscription(prev =>
        prev.subscribed ? prev : { subscribed: false, days_remaining: 0 }
      );
    } finally {
      if (showLoading) setSubLoading(false);
    }
  };

  const login = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    setSubLoading(true);
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSubscription({ subscribed: false, days_remaining: 0 });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token, subscription, subLoading, fetchSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
