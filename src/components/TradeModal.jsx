import { useState, useEffect, useRef, useMemo } from 'react';
import { ALL_INSTRUMENTS, CATEGORY_LABELS, SUBCATEGORY_LABELS } from '../constants/instruments';
import { SESSIONS, getSessionLocalTime, getActiveSessions } from '../constants/sessions';
import { useCurrency } from '../context/CurrencyContext';
import { useTimezone } from '../context/TimezoneContext';

export default function TradeModal({ isOpen, onClose, onSave, trade, prefillDate, accounts, selectedAccountId }) {
  const { currency, formatMoney } = useCurrency();
  const { timezone } = useTimezone();
  const [form, setForm] = useState({
    trade_date: '',
    account_id: '',
    market_type: 'forex',
    pair: 'EURUSD',
    lot_size: '',
    risk_type: 'amount',
    risk_value: '',
    result: 'win',
    pnl_amount: '',
    target_amount: '',
    risk_reward: '',
    session: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const searchRef = useRef(null);

  useEffect(() => {
    if (trade) {
      setForm({
        trade_date: trade.trade_date,
        account_id: trade.account_id || '',
        market_type: trade.market_type,
        pair: trade.pair,
        lot_size: trade.lot_size,
        risk_type: trade.risk_type,
        risk_value: trade.risk_value,
        result: trade.result,
        pnl_amount: Math.abs(trade.pnl_amount),
        target_amount: trade.target_amount || '',
        risk_reward: trade.risk_reward || '',
        session: trade.session || '',
        notes: trade.notes || '',
      });
    } else {
      // Suggest the currently active session based on user timezone
      const active = getActiveSessions(timezone);
      setForm({
        trade_date: prefillDate || new Date().toISOString().split('T')[0],
        account_id: selectedAccountId || '',
        market_type: 'forex',
        pair: 'EURUSD',
        lot_size: '',
        risk_type: 'amount',
        risk_value: '',
        result: 'win',
        pnl_amount: '',
        target_amount: '',
        risk_reward: '',
        session: active.length > 0 ? active[0] : '',
        notes: '',
      });
    }
    setSearchOpen(false);
    setSearchQuery('');
  }, [trade, isOpen, prefillDate, selectedAccountId]);

  useEffect(() => {
    if (!searchOpen) return;
    const handle = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [searchOpen]);

  const filtered = useMemo(() => {
    if (!isOpen) return [];
    let list = ALL_INSTRUMENTS.filter((i) => i.category === form.market_type);
    if (searchQuery) {
      const q = searchQuery.toUpperCase();
      list = list.filter((i) => i.symbol.includes(q) || i.label.toUpperCase().includes(q));
    }
    return list;
  }, [form.market_type, searchQuery, isOpen]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((i) => {
      const key = i.subcategory;
      if (!map[key]) map[key] = { subcategory: key, items: [] };
      map[key].items.push(i);
    });
    return Object.values(map);
  }, [filtered]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    const update = { ...form, [field]: value };
    if (field === 'market_type') {
      const first = ALL_INSTRUMENTS.find((i) => i.category === value);
      update.pair = first ? first.symbol : form.pair;
      setSearchQuery('');
      setSearchOpen(false);
    }
    setForm(update);
  };

  const selectPair = (symbol) => {
    setForm((prev) => ({ ...prev, pair: symbol }));
    setSearchQuery(symbol);
    setSearchOpen(false);
  };

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setForm((prev) => ({ ...prev, pair: val }));
    setSearchOpen(true);
    setHighlightIdx(0);
  };

  const handleSearchKeyDown = (e) => {
    const total = filtered.length;
    if (!searchOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setSearchOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIdx]) {
        selectPair(filtered[highlightIdx].symbol);
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const lot_size = parseFloat(form.lot_size);
      const risk_value = parseFloat(form.risk_value);
      const pnl_amount = parseFloat(form.pnl_amount);
      if (isNaN(lot_size) || isNaN(risk_value) || isNaN(pnl_amount)) {
        setError('Please enter valid numbers for Lot Size, Risk Value, and Trade Outcome.');
        setSaving(false);
        return;
      }
      const payload = {
        ...form,
        lot_size,
        risk_value,
        pnl_amount,
        target_amount: form.target_amount ? parseFloat(form.target_amount) : null,
      };
      if (form.result === 'loss') payload.pnl_amount = -Math.abs(payload.pnl_amount);
      if (form.result === 'win') payload.pnl_amount = Math.abs(payload.pnl_amount);

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save trade');
    } finally {
      setSaving(false);
    }
  };

  const riskUnit = form.risk_type === 'percentage' ? '%' : currency.symbol;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">{trade ? 'Edit Trade' : 'Add Trade'}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {error && <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {accounts && accounts.length > 0 && (
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Account</label>
              <select value={form.account_id} onChange={(e) => handleChange('account_id', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.capital > 0 ? ` (${formatMoney(a.capital)})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Date</label>
            <input type="date" value={form.trade_date} onChange={(e) => handleChange('trade_date', e.target.value)} required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Market Type</label>
            <div className="flex gap-2">
              {['forex', 'crypto', 'commodities'].map((type) => (
                <button key={type} type="button" onClick={() => handleChange('market_type', type)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    form.market_type === type
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="relative" ref={searchRef}>
            <label className="block text-sm text-neutral-400 mb-1">Symbol / Pair</label>
            <input
              type="text"
              value={form.pair}
              onChange={handleSearchInput}
              onFocus={() => { setSearchOpen(true); setSearchQuery(''); }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search or type a symbol..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 placeholder:text-neutral-600"
              autoComplete="off"
            />
            {searchOpen && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                {grouped.map((g) => (
                  <div key={g.subcategory}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider bg-neutral-850 sticky top-0 bg-neutral-800 border-b border-neutral-700/50">
                      {CATEGORY_LABELS[form.market_type]} — {SUBCATEGORY_LABELS[g.subcategory]}
                    </div>
                    {g.items.map((item, idx) => {
                      const globalIdx = filtered.indexOf(item);
                      return (
                        <button
                          key={item.symbol}
                          type="button"
                          onMouseEnter={() => setHighlightIdx(globalIdx)}
                          onClick={() => selectPair(item.symbol)}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                            globalIdx === highlightIdx
                              ? 'bg-emerald-600/20 text-white'
                              : 'text-neutral-300 hover:bg-neutral-700/50'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="text-xs text-neutral-500">{item.symbol}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {searchOpen && filtered.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 p-3 text-sm text-neutral-500 text-center">
                No matches — using &ldquo;{form.pair}&rdquo; as custom symbol
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Lot Size</label>
              <input type="text" inputMode="decimal" value={form.lot_size} onChange={(e) => handleChange('lot_size', e.target.value)} required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Risk Type</label>
              <div className="flex gap-2">
                {['amount', 'percentage'].map((type) => (
                  <button key={type} type="button" onClick={() => handleChange('risk_type', type)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                      form.risk_type === type
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}>
                    {type === 'amount' ? `Amount (${currency.symbol})` : 'Percentage (%)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Risk Value ({riskUnit})</label>
              <input type="text" inputMode="decimal" value={form.risk_value} onChange={(e) => handleChange('risk_value', e.target.value)} required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Risk/Reward</label>
              <select value={form.risk_reward} onChange={(e) => handleChange('risk_reward', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500">
                <option value="">Select</option>
                <option value="1:1">1:1</option>
                <option value="1:2">1:2</option>
                <option value="1:3">1:3</option>
                <option value="1:4">1:4</option>
                <option value="1:5">1:5</option>
                <option value="1:6">1:6</option>
                <option value="1:7">1:7</option>
                <option value="1:8">1:8</option>
                <option value="1:9">1:9</option>
                <option value="1:10">1:10</option>
                <option value="1:11">1:11</option>
                <option value="1:12">1:12</option>
                <option value="1:13">1:13</option>
                <option value="1:14">1:14</option>
                <option value="1:15">1:15</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Profit Target ({riskUnit})</label>
            <input type="text" inputMode="decimal" value={form.target_amount} onChange={(e) => handleChange('target_amount', e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Trade Result</label>
            <div className="flex gap-2">
              {['win', 'loss'].map((r) => (
                <button key={r} type="button" onClick={() => handleChange('result', r)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    form.result === r
                      ? r === 'win' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}>
                  {r === 'win' ? 'Win' : 'Loss'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Trade Outcome ({currency.symbol})</label>
            <input type="text" inputMode="decimal" value={form.pnl_amount} onChange={(e) => handleChange('pnl_amount', e.target.value)} required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Trading Session</label>
            <div className="grid grid-cols-2 gap-2">
              {SESSIONS.map((s) => {
                const localTime = getSessionLocalTime(s.key, timezone);
                const isActive = form.session === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleChange('session', isActive ? '' : s.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      isActive
                        ? 'text-white border-transparent'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700 hover:border-neutral-600'
                    }`}
                    style={isActive ? { backgroundColor: s.color + '33', borderColor: s.color, color: s.color } : {}}
                  >
                    <span className="text-base leading-none">{s.emoji}</span>
                    <span className="flex flex-col items-start min-w-0">
                      <span className="truncate">{s.label}</span>
                      {localTime && (
                        <span className="text-[10px] opacity-60 font-normal truncate">{localTime}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-neutral-600 mt-1.5">Optional — times shown in your timezone</p>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg py-2.5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : trade ? 'Update Trade' : 'Save Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
