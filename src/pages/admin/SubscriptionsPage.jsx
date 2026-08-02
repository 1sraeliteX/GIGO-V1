import { useEffect, useState, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, XCircle,
  Loader2, Check, Timer, Bell, BellOff,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// ─── Status badge (for subscription history rows) ─────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    expired:   'bg-neutral-700 text-neutral-400 border-neutral-700',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${map[status] ?? map.expired}`}>
      {status}
    </span>
  );
}

// ─── Subscribe modal toggle ───────────────────────────────────────────────────
function ModalToggle({ user, onToggled }) {
  const [toggling, setToggling] = useState(false);
  const { success, error: toastError } = useToast();
  const isHidden = !!user.subscription_override;

  const handleToggle = async () => {
    setToggling(true);
    try {
      await api.admin.users.update(user.id, { subscription_override: !isHidden });
      success(isHidden
        ? `Subscribe modal enabled for ${user.name}`
        : `Subscription granted — subscribe modal hidden for ${user.name}`
      );
      onToggled();
    } catch (e) {
      toastError(e.message);
    } finally {
      setToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      title={isHidden ? 'Modal hidden — click to show it' : 'Modal showing — click to hide it'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${
        isHidden
          ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
      }`}
    >
      {toggling
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : isHidden ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />
      }
      {isHidden ? 'Hidden' : 'Showing'}
    </button>
  );
}

// ─── Subscription countdown editor ───────────────────────────────────────────
// Setting days automatically enables subscription_override=1 and sets the end date.
// This replaces the separate "Grant" button — one action does it all.
function CountdownEditor({ user, onSaved }) {
  const [days, setDays]     = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const { success, error: toastError } = useToast();

  // Sync input to stored value when row refreshes
  useEffect(() => {
    if (user.subscription_override_end) {
      const diff = Math.max(0, Math.round(
        (new Date(user.subscription_override_end) - new Date()) / 86400000
      ));
      setDays(diff > 0 ? String(diff) : '');
    } else {
      setDays('');
    }
  }, [user.subscription_override_end]);

  const handleSet = async () => {
    const numDays = parseInt(days, 10);
    if (!numDays || numDays <= 0) return;
    setSaving(true);
    try {
      // Enable subscription_override AND set the end date in one call
      await api.admin.users.update(user.id, { subscription_override: true });
      await api.admin.users.setOverrideDays(user.id, numDays);
      success(`${numDays}-day subscription set for ${user.name}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (e) {
      toastError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <Timer className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 pointer-events-none" />
          <input
            type="number"
            min="1"
            max="9999"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSet()}
            placeholder="days"
            className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-neutral-600"
          />
        </div>
        <button
          onClick={handleSet}
          disabled={saving || !days || parseInt(days, 10) <= 0}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-1 min-w-[40px] justify-center"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : 'Set'}
        </button>
      </div>
      {user.subscription_override_end && (
        <p className="text-[10px] text-neutral-600">
          Ends {new Date(user.subscription_override_end).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// ─── User row with expandable subscription history ────────────────────────────
function UserSubRow({ user, onRefresh }) {
  const [expanded, setExpanded]       = useState(false);
  const [subs, setSubs]               = useState([]);
  const [subsLoaded, setSubsLoaded]   = useState(false);
  const [subsLoading, setSubsLoading] = useState(false);
  const [revoking, setRevoking]       = useState(null);
  const [error, setError]             = useState('');
  const { success, error: toastError } = useToast();

  const loadSubs = useCallback(async () => {
    setSubsLoading(true);
    try {
      const data = await api.admin.users.subscriptions.list(user.id);
      setSubs(data.subscriptions);
      setSubsLoaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubsLoading(false);
    }
  }, [user.id]);

  const handleExpand = () => {
    setExpanded(v => !v);
    if (!expanded && !subsLoaded) loadSubs();
  };

  const handleRevoke = async (subId) => {
    if (!window.confirm('Cancel this subscription?')) return;
    setRevoking(subId);
    try {
      await api.admin.subscriptions.revoke(subId);
      success('Subscription cancelled');
      loadSubs();
      onRefresh();
    } catch (e) {
      toastError(e.message);
    } finally {
      setRevoking(null);
    }
  };

  // Status label
  let statusLabel, statusClass;
  if (user.subscription_override) {
    if (user.subscription_override_end) {
      const daysLeft = Math.max(0, Math.round(
        (new Date(user.subscription_override_end) - new Date()) / 86400000
      ));
      statusLabel = `Subscribed · ${daysLeft}d left`;
      statusClass = daysLeft > 7 ? 'text-purple-400' : daysLeft > 0 ? 'text-amber-400' : 'text-red-400';
    } else {
      statusLabel = 'Subscribed';
      statusClass = 'text-purple-400';
    }
  } else if (user.active_plan && user.sub_end_date > new Date().toISOString()) {
    const daysLeft = Math.max(0, Math.round(
      (new Date(user.sub_end_date) - new Date()) / 86400000
    ));
    statusLabel = `${user.active_plan} · ${daysLeft}d left`;
    statusClass = 'text-emerald-400';
  } else {
    statusLabel = 'No active subscription';
    statusClass = 'text-neutral-600';
  }

  return (
    <>
      <tr className="hover:bg-neutral-800/30 transition-colors">
        {/* User */}
        <td className="px-4 py-3">
          <button onClick={handleExpand} className="flex items-center gap-2 text-left">
            {expanded
              ? <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />}
            <div>
              <p className="text-sm text-white font-medium">{user.name}</p>
              <p className="text-xs text-neutral-500">{user.email}</p>
            </div>
          </button>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <span className={`text-xs font-medium ${statusClass}`}>{statusLabel}</span>
        </td>

        {/* Subscribe modal toggle */}
        <td className="px-4 py-3">
          <ModalToggle user={user} onToggled={onRefresh} />
        </td>

        {/* Subscription countdown — also acts as grant */}
        <td className="px-4 py-3">
          <CountdownEditor user={user} onSaved={onRefresh} />
        </td>
      </tr>

      {/* Expanded subscription history */}
      {expanded && (
        <tr>
          <td colSpan={4} className="px-4 pb-4">
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            {subsLoading ? (
              <div className="flex items-center gap-2 text-xs text-neutral-500 py-2 pl-6">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
            ) : subs.length === 0 ? (
              <p className="text-xs text-neutral-600 pl-6 py-2">No subscription records.</p>
            ) : (
              <div className="ml-6 mt-1 bg-neutral-800/50 rounded-lg border border-neutral-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-700/60">
                      <th className="text-left px-3 py-2 text-neutral-500 font-medium">Plan</th>
                      <th className="text-left px-3 py-2 text-neutral-500 font-medium">Days</th>
                      <th className="text-left px-3 py-2 text-neutral-500 font-medium">End Date</th>
                      <th className="text-left px-3 py-2 text-neutral-500 font-medium">Status</th>
                      <th className="text-left px-3 py-2 text-neutral-500 font-medium">Ref</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700/40">
                    {subs.map((s) => (
                      <tr key={s.id} className="hover:bg-neutral-700/20">
                        <td className="px-3 py-2 text-white capitalize">{s.plan_type}</td>
                        <td className="px-3 py-2 text-neutral-400">{s.days_added}</td>
                        <td className="px-3 py-2 text-neutral-400">{new Date(s.end_date).toLocaleDateString()}</td>
                        <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                        <td className="px-3 py-2 text-neutral-600 font-mono truncate max-w-[120px]">{s.paystack_reference}</td>
                        <td className="px-3 py-2 text-right">
                          {s.status === 'active' && (
                            <button onClick={() => handleRevoke(s.id)} disabled={revoking === s.id}
                              className="text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-40">
                              {revoking === s.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <XCircle className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const [users, setUsers]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    api.admin.users.list({ page, limit: 30 })
      .then((data) => { setUsers(data.users); setTotal(data.total); setPages(data.pages); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, refreshKey]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Subscriptions</h1>
        <p className="text-sm text-neutral-500">
          Manage subscriptions for all {total} users. Type days and hit Set to grant access.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Subscribe Modal
                <span className="block text-[10px] normal-case font-normal text-neutral-600 mt-0.5">Show / hide for this user</span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Subscription Days
                <span className="block text-[10px] normal-case font-normal text-neutral-600 mt-0.5">Set days to grant access</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(4)].map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-neutral-600 text-sm">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <UserSubRow key={u.id} user={u} onRefresh={() => setRefreshKey(k => k + 1)} />
              ))
            )}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
            <p className="text-xs text-neutral-500">Page {page} of {pages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors">
                Prev
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages || loading}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
