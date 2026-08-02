// Trading session definitions with UTC hours and common timezone offsets.
// Hours are in UTC. e.g. London = 08:00–17:00 UTC.

export const SESSIONS = [
  {
    key: 'asia',
    label: 'Asia',
    emoji: '🌏',
    color: '#f59e0b',        // amber
    utcOpen: 0,              // 00:00 UTC
    utcClose: 9,             // 09:00 UTC
  },
  {
    key: 'london',
    label: 'London',
    emoji: '🇬🇧',
    color: '#3b82f6',        // blue
    utcOpen: 8,              // 08:00 UTC
    utcClose: 17,            // 17:00 UTC
  },
  {
    key: 'london_ny_overlap',
    label: 'London/NY Overlap',
    emoji: '⚡',
    color: '#8b5cf6',        // violet
    utcOpen: 13,             // 13:00 UTC
    utcClose: 17,            // 17:00 UTC
  },
  {
    key: 'new_york',
    label: 'New York',
    emoji: '🗽',
    color: '#10b981',        // emerald
    utcOpen: 13,             // 13:00 UTC
    utcClose: 22,            // 22:00 UTC
  },
];

/** Map from session key → session object for quick lookup */
export const SESSION_MAP = Object.fromEntries(SESSIONS.map((s) => [s.key, s]));

/**
 * Given the user's IANA timezone string, return a hint label showing local
 * open/close times for each session. Falls back gracefully if the timezone
 * is invalid.
 */
export function getSessionLocalTime(sessionKey, timezone) {
  const session = SESSION_MAP[sessionKey];
  if (!session) return '';
  try {
    const fmt = (utcHour) => {
      const d = new Date();
      d.setUTCHours(utcHour, 0, 0, 0);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
      });
    };
    return `${fmt(session.utcOpen)} – ${fmt(session.utcClose)}`;
  } catch {
    return '';
  }
}

/**
 * Detect which session(s) are currently active in the given timezone
 * and return their keys. Used to suggest a default session in the trade modal.
 */
export function getActiveSessions(timezone) {
  try {
    const nowUtc = new Date();
    const utcHour = nowUtc.getUTCHours();
    return SESSIONS.filter((s) => {
      if (s.utcOpen < s.utcClose) {
        return utcHour >= s.utcOpen && utcHour < s.utcClose;
      }
      // Overnight session (wraps midnight)
      return utcHour >= s.utcOpen || utcHour < s.utcClose;
    }).map((s) => s.key);
  } catch {
    return [];
  }
}

/** Popular IANA timezone options grouped by region */
export const TIMEZONE_OPTIONS = [
  { group: 'Africa', value: 'Africa/Lagos',       label: 'Lagos (WAT, UTC+1)' },
  { group: 'Africa', value: 'Africa/Nairobi',     label: 'Nairobi (EAT, UTC+3)' },
  { group: 'Africa', value: 'Africa/Johannesburg',label: 'Johannesburg (SAST, UTC+2)' },
  { group: 'Africa', value: 'Africa/Cairo',       label: 'Cairo (EET, UTC+2)' },
  { group: 'Africa', value: 'Africa/Accra',       label: 'Accra (GMT, UTC+0)' },
  { group: 'Americas', value: 'America/New_York', label: 'New York (ET)' },
  { group: 'Americas', value: 'America/Chicago',  label: 'Chicago (CT)' },
  { group: 'Americas', value: 'America/Denver',   label: 'Denver (MT)' },
  { group: 'Americas', value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { group: 'Americas', value: 'America/Toronto',  label: 'Toronto (ET)' },
  { group: 'Americas', value: 'America/Sao_Paulo',label: 'São Paulo (BRT, UTC-3)' },
  { group: 'Europe', value: 'Europe/London',      label: 'London (GMT/BST)' },
  { group: 'Europe', value: 'Europe/Paris',       label: 'Paris / Frankfurt (CET)' },
  { group: 'Europe', value: 'Europe/Moscow',      label: 'Moscow (MSK, UTC+3)' },
  { group: 'Asia', value: 'Asia/Dubai',           label: 'Dubai (GST, UTC+4)' },
  { group: 'Asia', value: 'Asia/Kolkata',         label: 'India (IST, UTC+5:30)' },
  { group: 'Asia', value: 'Asia/Singapore',       label: 'Singapore (SGT, UTC+8)' },
  { group: 'Asia', value: 'Asia/Tokyo',           label: 'Tokyo (JST, UTC+9)' },
  { group: 'Asia', value: 'Asia/Shanghai',        label: 'Shanghai (CST, UTC+8)' },
  { group: 'Asia', value: 'Asia/Hong_Kong',       label: 'Hong Kong (HKT, UTC+8)' },
  { group: 'Pacific', value: 'Australia/Sydney',  label: 'Sydney (AEST/AEDT)' },
  { group: 'UTC', value: 'UTC',                   label: 'UTC' },
];
