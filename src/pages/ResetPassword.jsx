import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const token = params.get('token') || '';
  const validLink = /^[a-f0-9]{64}$/.test(token) && email !== '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword({ email, token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
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
        <h2 className="text-lg text-neutral-400 mb-6">Choose a new password</h2>

        {!validLink ? (
          <div className="text-sm text-neutral-400">
            <p className="mb-4">This reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="text-emerald-400 hover:text-emerald-300">Request a new link</Link>
          </div>
        ) : done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-2">Password updated</p>
            <p className="text-sm text-neutral-400 mb-4">You can now sign in with your new password.</p>
            <Link to="/login" className="inline-block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg py-2.5 transition-colors">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">New password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Confirm password</label>
                <input type={showPassword ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50">
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}

        <p className="text-neutral-500 text-sm text-center mt-6">
          Back to <Link to="/login" className="text-emerald-400 hover:text-emerald-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
