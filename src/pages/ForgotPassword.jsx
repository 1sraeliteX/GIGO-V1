import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { api } from '../services/api';
import TurnstileWidget from '../components/TurnstileWidget';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!turnstileToken) {
      setError('Please complete the verification challenge.');
      return;
    }
    setLoading(true);
    try {
      await api.auth.forgotPassword({ email, 'cf-turnstile-response': turnstileToken });
      setSent(true);
    } catch (err) {
      setError(err.message);
      turnstileRef.current?.reset();
      setTurnstileToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md bg-neutral-900 rounded-xl border border-neutral-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="Wealthalliance" className="w-14 h-14 rounded-full object-cover" />
          <h1 className="text-2xl font-bold text-white">Wealthalliance</h1>
        </div>
        <h2 className="text-lg text-neutral-400 mb-6">Reset your password</h2>

        {sent ? (
          <div className="text-center py-4">
            <MailCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-2">Check your email</p>
            <p className="text-sm text-neutral-400">
              If an account exists for <span className="text-white">{email}</span>, a reset link has been sent.
              The link expires in 1 hour.
            </p>
          </div>
        ) : (
          <>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>}
            <p className="text-sm text-neutral-400 mb-4">
              Enter the email address on your account and we'll send you a link to choose a new password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <TurnstileWidget ref={turnstileRef} action="forgot_password" onToken={setTurnstileToken} />
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <p className="text-neutral-500 text-sm text-center mt-6">
          Remembered it? <Link to="/login" className="text-emerald-400 hover:text-emerald-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
