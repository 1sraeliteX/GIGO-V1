import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.auth.login({ email, password });
      login(data.user, data.token);
      success(`Welcome back, ${data.user.name}!`);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md bg-neutral-900 rounded-xl border border-neutral-800 p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Wealthalliance</h1>
        <h2 className="text-lg text-neutral-400 mb-6">Sign in to your account</h2>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-neutral-500 text-sm text-center mt-6">
          Don't have an account? <Link to="/register" className="text-emerald-400 hover:text-emerald-300">Register</Link>
        </p>
      </div>
    </div>
  );
}
