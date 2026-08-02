import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { CURRENCIES } from '../constants/currencies';

/**
 * Searchable currency picker dropdown.
 * Props:
 *   value        – selected currency code (e.g. 'USD')
 *   onChange     – called with new code string
 *   className    – extra classes for the trigger button
 */
export default function CurrencyPicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = CURRENCIES.find((c) => c.code === value) || CURRENCIES[0];

  const filtered = useMemo(() => {
    if (!query.trim()) return CURRENCIES;
    const q = query.toLowerCase();
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (code) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 hover:border-neutral-600 transition-colors w-full"
      >
        <span className="font-medium shrink-0">{selected.code}</span>
        <span className="text-neutral-500 text-xs shrink-0">{selected.symbol}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-700">
            <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search currency..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-56">
            {filtered.length === 0 ? (
              <div className="text-center text-sm text-neutral-500 py-6">No currencies found</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left ${
                    c.code === value
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'text-neutral-300 hover:bg-neutral-700/60 hover:text-white'
                  }`}
                >
                  <span className="font-medium w-10 shrink-0">{c.code}</span>
                  <span className="text-neutral-400 w-8 shrink-0 text-center">{c.symbol}</span>
                  <span className="text-neutral-500 text-xs truncate">{c.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
