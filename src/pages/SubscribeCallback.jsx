import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SubscribeCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { fetchSubscription } = useAuth();
  const [state, setState] = useState('verifying');
  const [detail, setDetail] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) {
      setState('error');
      setDetail('No payment reference was provided.');
      return;
    }
    api.subscribe.verify(reference)
      .then(async (d) => {
        setState('success');
        setDetail(`Your subscription is active until ${new Date(d.end_date).toLocaleDateString()}.`);
        await fetchSubscription();
      })
      .catch((e) => {
        setState('error');
        setDetail(e.message);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-sm w-full text-center">
        {state === 'verifying' && (
          <>
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
            <h1 className="text-white font-semibold mb-2">Confirming your payment…</h1>
            <p className="text-sm text-neutral-500">This takes a few seconds. Please don't close this page.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-white font-semibold mb-2">Payment confirmed</h1>
            <p className="text-sm text-neutral-400 mb-6">{detail}</p>
            <button onClick={() => navigate('/')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              Go to dashboard
            </button>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h1 className="text-white font-semibold mb-2">Payment not confirmed</h1>
            <p className="text-sm text-neutral-400 mb-2">{detail}</p>
            <p className="text-xs text-neutral-600 mb-6">If you were charged, your subscription will still activate automatically once Paystack notifies us. You can also contact the admin.</p>
            <button onClick={() => navigate('/')}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              Back to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}