import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const STYLES = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  error:   'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  info:    'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

const ICON_STYLES = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  warning: 'text-amber-400',
  info:    'text-blue-400',
};

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(ts => ts.map(t => t.id === id ? { ...t, leaving: true } : t));
    // Remove from DOM after animation
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 350);
  }, []);

  const toast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++idCounter;
    setToasts(ts => [...ts, { id, message, type, leaving: false }]);

    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience helpers
  const success = useCallback((msg, dur) => toast(msg, 'success', dur), [toast]);
  const error   = useCallback((msg, dur) => toast(msg, 'error', dur ?? 5000), [toast]);
  const warning = useCallback((msg, dur) => toast(msg, 'warning', dur), [toast]);
  const info    = useCallback((msg, dur) => toast(msg, 'info', dur), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}

      {/* Toast container — fixed top-right */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info;
          return (
            <div
              key={t.id}
              className={`
                pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
                backdrop-blur-sm transition-all duration-300
                ${STYLES[t.type]}
                ${t.leaving
                  ? 'opacity-0 translate-x-4 scale-95'
                  : 'opacity-100 translate-x-0 scale-100'
                }
              `}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${ICON_STYLES[t.type]}`} />
              <p className="text-sm flex-1 leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
