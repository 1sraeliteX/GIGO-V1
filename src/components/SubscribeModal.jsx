import { useState, useEffect } from 'react';
import { X, CheckCircle, CreditCard, Wallet, Clock } from 'lucide-react';
import { api } from '../services/api';

const USD_RATE = 1400;

export default function SubscribeModal({ isOpen, onClose, blocking = false }) {
  const [plans, setPlans] = useState({});
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [cryptoTooltip, setCryptoTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('plans');

  useEffect(() => {
    if (isOpen) {
      setStep('plans');
      setShowPaymentOptions(false);
      setError('');
      api.subscribe.plans().then(d => setPlans(d.plans)).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOnlinePayment = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.subscribe.initialize({ plan_type: selectedPlan });
      setStep('redirect');
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCrypto = () => {
    setCryptoTooltip(true);
    setTimeout(() => setCryptoTooltip(false), 3000);
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
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>
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
                {blocking ? 'Your subscription has expired. Choose a plan to regain access.' : 'Choose a plan to continue using GIGO.'}
              </p>

              {Object.entries(plans).map(([key, plan]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSelectedPlan(key); setShowPaymentOptions(true); }}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    selectedPlan === key
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                        selectedPlan === key ? 'bg-emerald-600 text-white' : 'bg-neutral-700 text-neutral-300'
                      }`}>
                        30d
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{plan.label}</p>
                        <p className="text-xs text-neutral-500">{plan.days} days of access</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">₦{plan.amount.toLocaleString()}</p>
                      <p className="text-xs text-neutral-400">~${(plan.amount / USD_RATE).toFixed(2)}</p>
                    </div>
                  </div>
                  {selectedPlan === key && showPaymentOptions && (
                    <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-xs">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Selected
                    </div>
                  )}
                </button>
              ))}

              {showPaymentOptions && (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleOnlinePayment}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-3 font-medium transition-colors disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    {loading ? 'Processing...' : 'Online Payment'}
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleCrypto}
                      className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg py-3 font-medium transition-colors border border-neutral-700"
                    >
                      <Wallet className="w-4 h-4" />
                      Crypto
                    </button>
                    {cryptoTooltip && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-700 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap">
                        Coming soon
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-700 rotate-45" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-neutral-400 text-center leading-relaxed">
                $1 ≈ ₦{USD_RATE.toLocaleString()} &middot; Secure payment via Paystack.<br />You will be redirected to complete payment.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
