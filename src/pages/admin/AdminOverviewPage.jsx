import { useEffect, useState } from 'react';
import { Users, CreditCard, ShieldCheck, ToggleRight, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';

function StatCard({ icon: Icon, label, value, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue:    'bg-blue-500/10 text-blue-400',
    amber:   'bg-amber-500/10 text-amber-400',
    purple:  'bg-purple-500/10 text-purple-400',
    rose:    'bg-rose-500/10 text-rose-400',
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white">
          {value === null ? <span className="text-neutral-600 text-base">—</span> : value}
        </p>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.admin.stats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-white mb-1">Overview</h1>
      <p className="text-sm text-neutral-500 mb-8">Platform summary at a glance.</p>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Users}       label="Total Users"          value={stats?.total_users}         color="blue" />
          <StatCard icon={CreditCard}  label="Active Subscribers"   value={stats?.active_subscribers}  color="emerald" />
          <StatCard icon={ToggleRight} label="Subscribed Users"   value={stats?.override_users}      color="amber" />
          <StatCard icon={ShieldCheck} label="Admin Users"           value={stats?.admin_users}         color="purple" />
          <StatCard icon={TrendingUp}  label="Total Trades Logged"   value={stats?.total_trades}        color="rose" />
        </div>
      )}
    </div>
  );
}
