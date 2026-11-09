import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Clock, CheckCircle, LogOut } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

const PLAN_ICONS = { monthly: '30d', quarterly: '90d', yearly: '365d' };

export default function SubscribeModal({ isOpen, onClose, blocking = false }) {
  const { user, fetchSubscription, logout } = useAuth();
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [plans, setPlans] = useState([]);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('plans');

  useEffect(() => {
    if (isOpen) {
      setStep('plans');
      setError('');
      api.subscribe.plans().then(d => { setPlans(d.plans); setCheckoutEnabled(!!d.checkout_enabled); }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const plan = plans[selectedPlan];
      // Automated checkout: per-user Paystack transaction so the system knows
      // exactly who paid and activates the subscription on return/webhook.
      if (checkoutEnabled) {
        const data = await api.subscribe.initialize({ plan_type: selectedPlan });
        setStep('redirect');
        window.location.href = data.authorization_url;
        return;
      }
      // Fallback: static payment link — cannot be attributed automatically.
      if (plan?.payment_link) {
        window.location.href = plan.payment_link;
        return;
      }
      throw new Error('Online payment is not configured yet. Please contact the admin.');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">
            {step === 'redirect' ? 'Redirecting...' : blocking ? 'Subscribe to Continue' : 'Subscribe'}
          </h2>
          {!blocking && (
            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm break-words">{error}</div>
          )}

          {step === 'redirect' ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-600/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
              <p className="text-white font-medium mb-2">Redirecting to Paystack...</p>
              <p className="text-sm text-neutral-400">Complete payment in the popup to activate your subscription.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-400">
                {blocking ? 'Your subscription has expired. Choose a plan to regain access to your trading journal.' : 'Choose a plan to continue using Tradora.'}
              </p>

              <div className="space-y-3">
                {Object.entries(plans).map(([key, plan]) => {
                  const perMonth = plan.days > 0 ? plan.amount / (plan.days / 30) : plan.amount;
                  return (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      selectedPlan === key
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${
                          selectedPlan === key ? 'bg-emerald-600 text-[#fff]' : 'bg-neutral-700 text-neutral-300'
                        }`}>
                          {PLAN_ICONS[key]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white leading-snug break-words">{plan.label}</p>
                          <p className="text-xs text-neutral-400">{plan.days} days of access</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-white whitespace-nowrap">${plan.amount}</p>
                        <p className="text-xs text-neutral-400 whitespace-nowrap">₦{(plan.amount * (plan.ngn_rate ?? 1400)).toLocaleString()}</p>
                        <p className="text-[11px] text-neutral-400 whitespace-nowrap">${perMonth.toFixed(2)}/month</p>
                      </div>
                    </div>
                    {selectedPlan === key && (
                      <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        Selected
                      </div>
                    )}
                  </button>
                  );
                })}
              </div>

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-[#fff] rounded-lg py-3 font-medium transition-colors disabled:opacity-50 mt-2"
              >
                {loading
                  ? 'Processing...'
                  : checkoutEnabled
                    ? `Pay ₦${((plans[selectedPlan]?.amount || 0) * (plans[selectedPlan]?.ngn_rate ?? 1400)).toLocaleString()} with Paystack`
                    : plans[selectedPlan]?.payment_link
                      ? `Pay $${plans[selectedPlan]?.amount || 0} →`
                      : `Pay $${plans[selectedPlan]?.amount || 0} with Paystack`
                }
              </button>

              <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
                $1 = ₦{(plans[selectedPlan]?.ngn_rate ?? 1400).toLocaleString()} &middot; Secure payment. You will be redirected to complete payment.
                {!checkoutEnabled && plans[selectedPlan]?.payment_link && ' After paying via the link, contact the admin to activate your account.'}
              </p>

              {blocking && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-[#fff] rounded-lg py-2.5 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}