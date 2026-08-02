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
    if (token) {
      fetchSubscription();
      // Poll every 30 seconds so admin-side changes (override toggle, granted
      // subscriptions) propagate to the user without requiring a re-login.
      const interval = setInterval(fetchSubscription, 30_000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchSubscription = async () => {
    if (!localStorage.getItem('token')) return;
    setSubLoading(true);
    try {
      const data = await api.subscribe.status();
      setSubscription(data);
    } catch (err) {
      // 401 = token expired or invalid — log the user out cleanly
      if (err.message?.toLowerCase().includes('401') || err.message?.toLowerCase().includes('authentication') || err.message?.toLowerCase().includes('invalid or expired')) {
        logout();
        return;
      }
      // Network / server error — don't reset subscription state so overridden
      // users aren't wrongly blocked if the backend has a momentary hiccup.
      // Only reset if we had no prior subscription info.
      setSubscription(prev =>
        prev.subscribed ? prev : { subscribed: false, days_remaining: 0 }
      );
    } finally {
      setSubLoading(false);
    }
  };

  const login = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
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
