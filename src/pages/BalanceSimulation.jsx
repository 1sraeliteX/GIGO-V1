import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, LineChart } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCurrency } from '../context/CurrencyContext';

export default function BalanceSimulation() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currency } = useCurrency();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inputClass = 'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';

  useEffect(() => {
    api.grindReport.getSettings()
      .then(setSettings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (field) => (e) => setSettings(prev => ({ ...prev, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await api.grindReport.updateSettings({
        start_balance: parseFloat(settings.start_balance) || 0,
        win_amount: parseFloat(settings.win_amount) || 0,
        loss_amount: parseFloat(settings.loss_amount) || 0,
        pnl_mode: settings.pnl_mode,
      });
      setSettings(saved);
      toast?.success?.('Simulation updated — the Grind Report now reflects these values.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-800" title="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base sm:text-xl font-bold text-white">Balance Simulation</h1>
          <div className="flex-1" />
          <button onClick={() => navigate('/grind-report')}
            className="flex items-center gap-1.5 text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-1.5 transition-colors">
            <LineChart className="w-3.5 h-3.5" />
            View Grind Report
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-16 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500"><RefreshCw className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : !settings ? (
          <p className="text-sm text-neutral-500">Could not load your simulation settings. {error}</p>
        ) : (
          <>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 space-y-4">
              <p className="text-sm text-neutral-400">
                Simulate different balance amounts against your grind to see how the account behaves.
                Set the start balance and per-trade win/loss below, save, and the
                <span className="text-neutral-200"> Grind Report</span> curve, progress and projections
                recalculate for that account size — your logged trades stay untouched.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-xs text-neutral-400">
                  Start balance <span className="text-neutral-600">({currency.symbol})</span>
                  <input type="number" min="0" step="0.01" value={settings.start_balance} onChange={set('start_balance')}
                    className={`${inputClass} mt-1.5`} />
                  <span className="block text-[11px] text-neutral-600 mt-1">The account size to simulate — try 1,000 then 10,000 and compare the curve.</span>
                </label>
                <label className="block text-xs text-neutral-400">
                  P/L mode
                  <select value={settings.pnl_mode} onChange={set('pnl_mode')} className={`${inputClass} mt-1.5`}>
                    <option value="fixed">Fixed (+W / −L per trade)</option>
                    <option value="actual">Actual recorded P/L</option>
                  </select>
                  <span className="block text-[11px] text-neutral-600 mt-1">
                    {settings.pnl_mode === 'fixed'
                      ? 'Every winning trade adds the win amount; every losing trade subtracts the loss amount.'
                      : 'Uses the real P/L you recorded on each trade.'}
                  </span>
                </label>
              </div>

              {settings.pnl_mode === 'fixed' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block text-xs text-neutral-400">
                    Win amount <span className="text-neutral-600">({currency.symbol})</span>
                    <input type="number" min="0" step="0.01" value={settings.win_amount} onChange={set('win_amount')}
                      className={`${inputClass} mt-1.5`} />
                    <span className="block text-[11px] text-neutral-600 mt-1">Added for each winning trade.</span>
                  </label>
                  <label className="block text-xs text-neutral-400">
                    Loss amount <span className="text-neutral-600">({currency.symbol})</span>
                    <input type="number" min="0" step="0.01" value={settings.loss_amount} onChange={set('loss_amount')}
                      className={`${inputClass} mt-1.5`} />
                    <span className="block text-[11px] text-neutral-600 mt-1">Subtracted for each losing trade.</span>
                  </label>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm break-words">{error}</div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#fff] text-sm font-semibold rounded-lg py-2.5 transition-colors">
                  {saving ? 'Saving…' : 'Save & recalculate'}
                </button>
                <button onClick={() => navigate('/grind-report')}
                  className="px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-lg transition-colors">
                  Open report
                </button>
              </div>
            </div>

            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 sm:p-5 text-xs text-neutral-500 space-y-2">
              <p className="font-medium text-neutral-300">How the simulation works</p>
              <p>1. Save a different start balance to see how another account size would behave through the same grind — growth speed, drawdown depth and target progress all shift with the starting amount.</p>
              <p>2. In <span className="text-neutral-400">Fixed</span> mode, win and loss amounts are applied per trade regardless of the P/L you recorded — useful for projecting a plan.</p>
              <p>3. In <span className="text-neutral-400">Actual</span> mode, the curve uses the real P/L from each logged trade, and the win/loss amounts are ignored.</p>
              <p>4. Breakeven trades (P/L = 0) are excluded from the simulation.</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
