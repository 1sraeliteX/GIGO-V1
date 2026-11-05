import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { api } from '../../services/api';

const DEFAULTS = { start_balance: 1000, win_amount: 40, loss_amount: 10, pnl_mode: 'fixed' };

export default function GrindSettings({ onSettingsChange }) {
  const [form, setForm]       = useState(DEFAULTS);
  const [saved, setSaved]     = useState(DEFAULTS);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');
  const [err, setErr]         = useState('');

  useEffect(() => {
    api.grind.getSettings()
      .then((s) => {
        const vals = {
          start_balance: s.start_balance ?? DEFAULTS.start_balance,
          win_amount:    s.win_amount    ?? DEFAULTS.win_amount,
          loss_amount:   s.loss_amount   ?? DEFAULTS.loss_amount,
          pnl_mode:      s.pnl_mode      ?? DEFAULTS.pnl_mode,
        };
        setForm(vals);
        setSaved(vals);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      await api.grind.saveSettings(form);
      setSaved(form);
      setMsg('Settings saved — report recalculated.');
      onSettingsChange?.(form);
      setTimeout(() => setMsg(''), 3000);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(saved);
    setMsg('');
    setErr('');
  };

  if (loading) {
    return <div className="text-xs text-neutral-500 py-4 text-center">Loading settings…</div>;
  }

  return (
    <form onSubmit={handleSave} className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Grind Report Settings</h3>
        <span className="text-[10px] text-neutral-500">Changes trigger instant recalculation</span>
      </div>

      {err && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs">{err}</div>
      )}
      {msg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg p-3 text-xs">{msg}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Start balance */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Starting Balance ($)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.start_balance}
            onChange={(e) => setForm((f) => ({ ...f, start_balance: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            required
          />
        </div>
        {/* Win amount */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Win Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.win_amount}
            onChange={(e) => setForm((f) => ({ ...f, win_amount: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            required
          />
        </div>
        {/* Loss amount */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Loss Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.loss_amount}
            onChange={(e) => setForm((f) => ({ ...f, loss_amount: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            required
          />
        </div>
        {/* PNL mode */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">P/L Mode</label>
          <select
            value={form.pnl_mode}
            onChange={(e) => setForm((f) => ({ ...f, pnl_mode: e.target.value }))}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="fixed">Fixed (use W/L amounts above)</option>
            <option value="actual">Actual (use recorded P/L)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end pt-1">
        {isDirty && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg transition-colors border border-neutral-700"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="flex items-center gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : 'Save & Recalculate'}
        </button>
      </div>
    </form>
  );
}
