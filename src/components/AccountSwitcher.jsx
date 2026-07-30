import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { api } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

export default function AccountSwitcher({ accounts, selectedId, onSelect, onAccountsChange }) {
  const { currency, formatMoney } = useCurrency();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCapital, setFormCapital] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selected = selectedId ? accounts.find((a) => a.id === selectedId) : null;

  const resetForm = () => {
    setShowForm(false);
    setFormName('');
    setFormCapital('');
    setCreateError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setCreating(true);
    try {
      const data = await api.accounts.create({ name: formName.trim(), capital: parseFloat(formCapital) || 0 });
      resetForm();
      onAccountsChange?.();
      onSelect(data.id);
    } catch (err) {
      setCreateError(err?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); resetForm(); }}
        className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-neutral-400 hover:text-white transition-colors truncate max-w-full"
      >
        <span className="truncate">{selected ? selected.name : 'All Accounts'}</span>
        <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg py-1 min-w-[160px] sm:min-w-[200px] shadow-lg z-50">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm transition-colors ${
              !selectedId ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            All Accounts
          </button>
          {accounts.length > 0 && <div className="border-t border-neutral-700 mx-2" />}
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => { onSelect(a.id); setOpen(false); resetForm(); }}
              className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm transition-colors ${
                selectedId === a.id ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="truncate">{a.name}</span>
              {a.capital > 0 && (
                <span className="text-[10px] sm:text-xs text-neutral-500 ml-1 sm:ml-2">
                  {formatMoney(a.capital)}
                </span>
              )}
            </button>
          ))}
          <div className="border-t border-neutral-700 mx-2" />
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 sm:gap-1.5"
            >
              <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Add Account
            </button>
          ) : (
              <div className="px-2 sm:px-3 py-2 space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs text-neutral-400">New Account</span>
                  <button onClick={resetForm} className="text-neutral-500 hover:text-white">
                    <X className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                  </button>
                </div>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="Name" autoFocus
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs text-white focus:outline-none focus:border-emerald-500" />
                {createError && (
                  <p className="text-[10px] text-red-400">{createError}</p>
                )}
                <input type="text" inputMode="decimal" value={formCapital} onChange={(e) => setFormCapital(e.target.value)}
                  placeholder={`Capital (${currency.symbol})`}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs text-white focus:outline-none focus:border-emerald-500" />
                <button onClick={handleCreate} disabled={creating}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-colors disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
          )}
        </div>
      )}
    </div>
  );
}
