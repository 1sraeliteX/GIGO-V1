import { useEffect, useState, useCallback } from 'react';
import {
  Save, Loader2, Link, DollarSign, Calendar,
  FileText, ToggleLeft, ToggleRight, RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const PLAN_BADGE = { monthly: '30d', quarterly: '90d', yearly: '365d' };
const PLAN_COLOR = {
  monthly:   'bg-blue-500/10 border-blue-500/30 text-blue-400',
  quarterly: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  yearly:    'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
};

// ─── Single plan editor card ──────────────────────────────────────────────────
function PlanCard({ plan: initialPlan, onSaved }) {
  const [plan, setPlan]     = useState(initialPlan);
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  // Keep local state in sync if parent refreshes
  useEffect(() => { setPlan(initialPlan); }, [initialPlan]);

  const set = (field, value) => setPlan(p => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.admin.plans.update(plan.plan_key, {
        label:        plan.label,
        days:         parseInt(plan.days, 10),
        amount_usd:   parseFloat(plan.amount_usd),
        ngn_rate:     parseInt(plan.ngn_rate, 10),
        description:  plan.description,
        payment_link: plan.payment_link || '',
        is_active:    plan.is_active ? 1 : 0,
      });
      setPlan(res.plan);
      success(`${plan.label} plan saved`);
      onSaved?.();
    } catch (e) {
      toastError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Derived preview values
  const amountUsd = parseFloat(plan.amount_usd) || 0;
  const ngnRate   = parseInt(plan.ngn_rate, 10) || 1400;
  const days      = parseInt(plan.days, 10) || 1;
  const ngnTotal  = amountUsd * ngnRate;
  const perDay    = amountUsd / days;

  return (
    <div className={`bg-neutral-900 border rounded-xl overflow-hidden ${plan.is_active ? 'border-neutral-800' : 'border-neutral-800 opacity-60'}`}>
      {/* Card header */}
      <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold border ${PLAN_COLOR[plan.plan_key] ?? 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
            {PLAN_BADGE[plan.plan_key] ?? plan.days + 'd'}
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{plan.label}</p>
            <p className="text-[11px] text-neutral-500 capitalize">{plan.plan_key} plan</p>
          </div>
        </div>
        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{plan.is_active ? 'Active' : 'Hidden'}</span>
          <button
            onClick={() => set('is_active', !plan.is_active)}
            className="text-neutral-400 hover:text-white transition-colors"
            title="Toggle plan visibility on payment page"
          >
            {plan.is_active
              ? <ToggleRight className="w-5 h-5 text-emerald-400" />
              : <ToggleLeft  className="w-5 h-5" />
            }
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="p-5 space-y-4">

        {/* Label + Description side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Plan Label</label>
            <input
              type="text"
              value={plan.label}
              onChange={e => set('label', e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">
              <FileText className="w-3 h-3 inline mr-1" />Description
            </label>
            <input
              type="text"
              value={plan.description}
              onChange={e => set('description', e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Days + USD price + NGN rate */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />Days
            </label>
            <input
              type="number" min="1" max="9999"
              value={plan.days}
              onChange={e => set('days', e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">
              <DollarSign className="w-3 h-3 inline mr-1" />Price (USD)
            </label>
            <input
              type="number" min="0" step="0.01"
              value={plan.amount_usd}
              onChange={e => set('amount_usd', e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">
              NGN Rate (₦/$1)
            </label>
            <input
              type="number" min="1"
              value={plan.ngn_rate}
              onChange={e => set('ngn_rate', e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Payment link */}
        <div>
          <label className="block text-[11px] text-neutral-400 mb-1">
            <Link className="w-3 h-3 inline mr-1" />
            Payment Link
            <span className="text-neutral-600 ml-1">(Paystack / crypto / any URL — users are redirected here when they click this plan)</span>
          </label>
          <input
            type="url"
            value={plan.payment_link || ''}
            onChange={e => set('payment_link', e.target.value)}
            placeholder="https://paystack.com/pay/your-plan-link"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-neutral-600"
          />
          {plan.payment_link && (
            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
              <Link className="w-2.5 h-2.5" />
              Link set — users will be redirected to this URL on click
            </p>
          )}
          {!plan.payment_link && (
            <p className="text-[10px] text-amber-500 mt-1">
              No link set — clicking this plan will use Paystack API initialization instead
            </p>
          )}
        </div>

        {/* Live preview */}
        <div className="bg-neutral-800/60 rounded-lg px-4 py-3 border border-neutral-700/50">
          <p className="text-[11px] text-neutral-500 mb-2 uppercase tracking-wider">Preview — as shown to users</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{plan.label || '—'}</p>
              <p className="text-xs text-neutral-500">{plan.description || '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white">${amountUsd.toFixed(2)}</p>
              <p className="text-xs text-neutral-400">₦{ngnTotal.toLocaleString()}</p>
              <p className="text-[10px] text-neutral-500">${perDay.toFixed(2)}/day</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><Save className="w-4 h-4" /> Save {plan.label} Plan</>
          }
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const [plans, setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const { error: toastError } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.admin.plans.list()
      .then(data => setPlans(data.plans))
      .catch(e  => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Plans</h1>
          <p className="text-sm text-neutral-500">
            Edit pricing, descriptions, and payment links for each subscription plan.
            Changes take effect immediately for all users.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl h-96 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {plans.map(plan => (
            <PlanCard key={plan.plan_key} plan={plan} onSaved={load} />
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <p className="text-xs text-blue-400 font-medium mb-1">How payment links work</p>
        <ul className="text-xs text-neutral-500 space-y-1 list-disc list-inside">
          <li>Set a <span className="text-white">Payment Link</span> to redirect users directly to your Paystack payment page, crypto wallet, or any custom URL when they click a plan.</li>
          <li>Leave the link <span className="text-white">empty</span> to use the default Paystack API flow (initializes a transaction server-side).</li>
          <li>Use the <span className="text-white">Active toggle</span> to show or hide a plan on the subscribe modal without deleting it.</li>
          <li>The <span className="text-white">NGN Rate</span> controls the ₦ display only — it does not affect what Paystack charges.</li>
        </ul>
      </div>
    </div>
  );
}
