import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import GrindTable from '../components/grind/GrindTable';
import BalanceLog from '../components/grind/BalanceLog';
import BalanceGrid from '../components/grind/BalanceGrid';
import BalanceChart from '../components/grind/BalanceChart';
import StatsPanel from '../components/grind/StatsPanel';

const TABS = ['Grind Table', 'Balance Log', 'Balance', 'Chart'];

export default function GrindReport() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState(TABS[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '', pair: '', account_id: '' });
  const [accounts, setAccounts] = useState([]);
  const [allMarkets, setAllMarkets] = useState([]);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async (f) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v !== '' && v != null) params[k] = v; });
      const data = await api.grindReport.get(params);
      setReport(data);
      if (!f.pair) setAllMarkets(data.markets.map(m => m.name));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
    api.grindReport.getSettings().then(setSettings).catch(() => {});
    api.accounts.list().then(d => setAccounts(d.accounts ?? d ?? [])).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = (next) => {
    setFilters(next);
    load(next);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const body = {
        start_balance: parseFloat(settings.start_balance) || 0,
        win_amount: parseFloat(settings.win_amount) || 0,
        loss_amount: parseFloat(settings.loss_amount) || 0,
        pnl_mode: settings.pnl_mode,
      };
      const saved = await api.grindReport.updateSettings(body);
      setSettings(saved);
      await load(filters);
      toast?.success?.('Grind settings saved');
    } catch (e) {
      toast?.error?.(e.message) || setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500';

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-800" title="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base sm:text-xl font-bold text-white">Grind Report</h1>
          <div className="flex-1" />
          <button onClick={() => load(filters)} disabled={loading}
            className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-800 disabled:opacity-40" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowSettings(v => !v)}
            className="text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-1.5 transition-colors">
            Settings
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-4 pb-16">
        {showSettings && settings && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              <label className="text-[11px] text-neutral-400">
                Start balance ($)
                <input type="number" min="0" step="0.01" value={settings.start_balance}
                  onChange={e => setSettings({ ...settings, start_balance: e.target.value })}
                  className={`${inputClass} w-full mt-1`} />
              </label>
              <label className="text-[11px] text-neutral-400">
                Win amount ($)
                <input type="number" min="0" step="0.01" value={settings.win_amount}
                  onChange={e => setSettings({ ...settings, win_amount: e.target.value })}
                  className={`${inputClass} w-full mt-1`} />
              </label>
              <label className="text-[11px] text-neutral-400">
                Loss amount ($)
                <input type="number" min="0" step="0.01" value={settings.loss_amount}
                  onChange={e => setSettings({ ...settings, loss_amount: e.target.value })}
                  className={`${inputClass} w-full mt-1`} />
              </label>
              <label className="text-[11px] text-neutral-400">
                P/L mode
                <select value={settings.pnl_mode}
                  onChange={e => setSettings({ ...settings, pnl_mode: e.target.value })}
                  className={`${inputClass} w-full mt-1`}>
                  <option value="fixed">Fixed (+W / -L)</option>
                  <option value="actual">Actual recorded P/L</option>
                </select>
              </label>
              <div className="flex items-end">
                <button onClick={saveSettings} disabled={saving}
                  className="w-full text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#fff] font-semibold rounded-lg px-3 py-2 transition-colors">
                  {saving ? 'Saving…' : 'Save & recalculate'}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">Breakeven trades (P/L = 0) are excluded. Saving recalculates all views.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={filters.from} onChange={e => applyFilters({ ...filters, from: e.target.value })}
            className={inputClass} title="From date" />
          <span className="text-xs text-neutral-500">to</span>
          <input type="date" value={filters.to} onChange={e => applyFilters({ ...filters, to: e.target.value })}
            className={inputClass} title="To date" />
          <select value={filters.pair} onChange={e => applyFilters({ ...filters, pair: e.target.value })} className={inputClass}>
            <option value="">All markets</option>
            {allMarkets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filters.account_id} onChange={e => applyFilters({ ...filters, account_id: e.target.value })} className={inputClass}>
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {(filters.from || filters.to || filters.pair || filters.account_id) && (
            <button onClick={() => applyFilters({ from: '', to: '', pair: '', account_id: '' })}
              className="text-xs text-neutral-500 hover:text-white transition-colors">
              Clear filters
            </button>
          )}
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--loss-color)' }}>{error}</p>}

        {report && (
          <>
            <StatsPanel report={report} />
            <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    tab === t ? 'border-emerald-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            {loading ? (
              <p className="text-sm text-neutral-500 py-8 text-center">Loading…</p>
            ) : (
              <>
                {tab === 'Grind Table' && <GrindTable report={report} />}
                {tab === 'Balance Log' && <BalanceLog report={report} />}
                {tab === 'Balance' && <BalanceGrid report={report} />}
                {tab === 'Chart' && <BalanceChart report={report} />}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}