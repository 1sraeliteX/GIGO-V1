import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'user_timezone';

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function loadTimezone() {
  try {
    return localStorage.getItem(STORAGE_KEY) || detectTimezone();
  } catch {
    return detectTimezone();
  }
}

const TimezoneContext = createContext(null);

export function TimezoneProvider({ children }) {
  const [timezone, setTimezoneState] = useState(loadTimezone);

  const setTimezone = (tz) => {
    setTimezoneState(tz);
    try {
      localStorage.setItem(STORAGE_KEY, tz);
    } catch {
      // localStorage not available
    }
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const ctx = useContext(TimezoneContext);
  if (!ctx) throw new Error('useTimezone must be used inside TimezoneProvider');
  return ctx;
}
