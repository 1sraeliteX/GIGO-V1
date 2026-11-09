import { useEffect, useState } from 'react';
import { KeyRound, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';

export default function PaymentsPage() {
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [masked, setMasked] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  const load = () => {
    setLoading(true);
    api.admin.paymentSettings.get()
      .then(d => {
        setPublicKey(d.public_key || '');
        setMasked(d.secret_key_masked || '');
        setEnabled(d.checkout_enabled);
      })
      .catch(e => setMessage({ type: 'error', text: e.message }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = { public_key: publicKey };
      if (secretKey.trim()) body.secret_key = secretKey.trim();
      await api.admin.paymentSettings.update(body);
      setSecretKey('');
      setMessage({ type: 'success', text: 'Payment settings saved.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const d = await api.admin.paymentSettings.test();
      setMessage({ type: 'success', text: d.message });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setTesting(false);
    }
  };

  const inputClass = 'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono';

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Payment Settings</h1>
        </div>
        <p className="text-sm text-neutral-500">
          Paystack API keys for automated subscriptions. Get them from your{' '}
          <span className="text-neutral-300">Paystack Dashboard → Settings → API Keys & Webhooks</span>.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 space-y-4 max-w-2xl">
          <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${enabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
            {enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {enabled ? 'Automated checkout is active — payments activate subscriptions instantly.' : 'No secret key set — automated checkout is off.'}
          </div>

          <label className="block text-xs text-neutral-400">
            Public key
            <input value={publicKey} onChange={e => setPublicKey(e.target.value)} placeholder="pk_test_… or pk_live_…" className={`${inputClass} mt-1`} />
          </label>

          <label className="block text-xs text-neutral-400">
            Secret key {masked && <span className="text-neutral-600">(stored: {masked} — leave blank to keep)</span>}
            <div className="relative mt-1">
              <input type={showSecret ? 'text' : 'password'} value={secretKey} onChange={e => setSecretKey(e.target.value)}
                placeholder="sk_test_… or sk_live_…" className={`${inputClass} pr-10`} autoComplete="new-password" />
              <button type="button" onClick={() => setShowSecret(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {message && (
            <div className={`text-xs rounded-lg px-3 py-2 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {message.text}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#fff] text-sm font-semibold rounded-lg py-2.5 transition-colors">
              {saving ? 'Saving…' : 'Save keys'}
            </button>
            <button onClick={test} disabled={testing || !enabled}
              className="px-4 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 text-sm rounded-lg transition-colors">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test connection'}
            </button>
          </div>

          <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500 space-y-2">
            <p className="font-medium text-neutral-300">How automation works</p>
            <p>1. Each user's payment is initialized with their account ID and a unique reference, so the system always knows who paid.</p>
            <p>2. After payment, the subscription activates instantly and the subscribe popup disappears. When it expires, the popup returns automatically.</p>
            <p>3. Set this webhook URL in Paystack (Settings → API Keys & Webhooks) so payments activate even if the user closes the browser:</p>
            <code className="block bg-neutral-800 rounded-lg px-3 py-2 text-emerald-400 break-all">{window.location.origin}/api/paystack/webhook</code>
            <p>Payment links on the Plans page remain as a manual fallback — link payments can't be matched to accounts automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
}