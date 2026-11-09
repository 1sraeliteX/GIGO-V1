import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useCurrency } from './CurrencyContext';

const AuthContext = createContext(null);

function readStoredUser() {
  const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const { setCurrencyCode } = useCurrency();
  // Must be synchronous: route guards read user.is_admin on the first render, so an
  // effect-set user would bounce every /admin deep link or refresh back to the dashboard.
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(localStorage.getItem('token') || sessionStorage.getItem('token'));
  const [subscription, setSubscription] = useState({ subscribed: false, days_remaining: 0 });
  const [subLoading, setSubLoading] = useState(true);

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
    if (!localStorage.getItem('token') && !sessionStorage.getItem('token')) return;
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

  const login = (userData, jwt, remember = false) => {
    setUser(userData);
    setToken(jwt);
    setSubLoading(true);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('token', jwt);
    storage.setItem('user', JSON.stringify(userData));
    // Clear the other storage to avoid conflicts
    (remember ? sessionStorage : localStorage).removeItem('token');
    (remember ? sessionStorage : localStorage).removeItem('user');
    // The currency chosen at sign-up is the display currency for balances and accounts.
    if (userData?.currency) setCurrencyCode(userData.currency);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSubscription({ subscribed: false, days_remaining: 0 });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
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
