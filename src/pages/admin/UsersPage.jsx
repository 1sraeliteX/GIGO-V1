import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, ChevronLeft, ChevronRight, Pencil, Trash2,
  ShieldCheck, ToggleLeft, ToggleRight, X, Check, Loader2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Small reusable toggle ────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        value ? 'bg-emerald-600' : 'bg-neutral-700'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
          value ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ user, onConfirm, onCancel, loading }) {
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-semibold text-white mb-2">Delete user?</h3>
        <p className="text-sm text-neutral-400 mb-6">
          This will permanently delete <span className="text-white font-medium">{user.name}</span> ({user.email}) and all their data. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit user modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, onSave, onCancel, currentAdminId }) {
  const [form, setForm] = useState({
    name:                  user?.name ?? '',
    email:                 user?.email ?? '',
    max_trades_per_day:    user?.max_trades_per_day ?? '',
    is_admin:              user?.is_admin ?? false,
    subscription_override: user?.subscription_override ?? false,
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  if (!user) return null;

  const isSelf = user.id === currentAdminId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.admin.users.update(user.id, {
        name:                  form.name,
        email:                 form.email,
        max_trades_per_day:    form.max_trades_per_day === '' ? null : parseInt(form.max_trades_per_day, 10),
        is_admin:              form.is_admin,
        subscription_override: form.subscription_override,
      });
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h3 className="text-base font-semibold text-white">Edit User</h3>
          <button onClick={onCancel} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Max Trades / Day <span className="text-neutral-600">(leave blank for unlimited)</span></label>
            <input
              type="number"
              min="1"
              value={form.max_trades_per_day}
              onChange={(e) => setForm(f => ({ ...f, max_trades_per_day: e.target.value }))}
              placeholder="Unlimited"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-white">Subscription Override</p>
              <p className="text-xs text-neutral-500">Bypasses payment gate entirely</p>
            </div>
            <Toggle
              value={form.subscription_override}
              onChange={(v) => setForm(f => ({ ...f, subscription_override: v }))}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-white">Admin Access</p>
              <p className="text-xs text-neutral-500">Grants full admin panel access</p>
            </div>
            <Toggle
              value={form.is_admin}
              onChange={(v) => setForm(f => ({ ...f, is_admin: v }))}
              disabled={isSelf}
            />
          </div>
          {isSelf && (
            <p className="text-xs text-amber-500 -mt-2">You cannot revoke your own admin access.</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-sm transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-status badge ─────────────────────────────────────────────────────────
function SubBadge({ user }) {
  if (user.subscription_override) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">Override</span>;
  }
  if (user.active_plan && user.sub_end_date && user.sub_end_date > new Date().toISOString()) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{user.active_plan}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-700 text-neutral-400">none</span>;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [editUser, setEditUser]     = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const searchTimer = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.admin.users.list({ page, limit: 20, ...(search ? { search } : {}) })
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setSearch(val.trim());
    }, 400);
  };

  const handleToggleOverride = async (user) => {
    setTogglingId(user.id);
    try {
      await api.admin.users.update(user.id, { subscription_override: !user.subscription_override });
      setUsers(us => us.map(u => u.id === user.id ? { ...u, subscription_override: !u.subscription_override } : u));
    } catch (e) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleAdmin = async (user) => {
    if (user.id === currentAdmin?.id) return; // safety
    const confirmed = window.confirm(
      user.is_admin
        ? `Revoke admin access from ${user.name}?`
        : `Grant admin access to ${user.name}?`
    );
    if (!confirmed) return;
    setTogglingId(user.id);
    try {
      await api.admin.users.update(user.id, { is_admin: !user.is_admin });
      setUsers(us => us.map(u => u.id === user.id ? { ...u, is_admin: !u.is_admin } : u));
    } catch (e) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.admin.users.delete(deleteUser.id);
      setDeleteUser(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Users</h1>
          <p className="text-sm text-neutral-500">{total} total users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Subscription</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Override</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Admin</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Max Trades</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-600 text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-800/40 transition-colors">
                    {/* User info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate max-w-[140px]">{u.name}</p>
                          <p className="text-neutral-500 text-xs truncate max-w-[140px]">{u.email}</p>
                        </div>
                        {u.is_admin && (
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" title="Admin" />
                        )}
                      </div>
                    </td>

                    {/* Sub badge */}
                    <td className="px-4 py-3">
                      <SubBadge user={u} />
                      {u.sub_end_date && !u.subscription_override && (
                        <p className="text-[10px] text-neutral-600 mt-0.5">
                          ends {new Date(u.sub_end_date).toLocaleDateString()}
                        </p>
                      )}
                    </td>

                    {/* Override toggle */}
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        value={!!u.subscription_override}
                        onChange={() => handleToggleOverride(u)}
                        disabled={togglingId === u.id}
                      />
                    </td>

                    {/* Admin toggle */}
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        value={!!u.is_admin}
                        onChange={() => handleToggleAdmin(u)}
                        disabled={togglingId === u.id || u.id === currentAdmin?.id}
                      />
                    </td>

                    {/* Max trades */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-neutral-300 text-xs">
                        {u.max_trades_per_day ?? <span className="text-neutral-600">∞</span>}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <span className="text-neutral-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditUser(u)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteUser(u)}
                          disabled={u.id === currentAdmin?.id}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
            <p className="text-xs text-neutral-500">Page {page} of {pages}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditUserModal
        user={editUser}
        currentAdminId={currentAdmin?.id}
        onSave={() => { setEditUser(null); load(); }}
        onCancel={() => setEditUser(null)}
      />

      <ConfirmDeleteModal
        user={deleteUser}
        onConfirm={handleDelete}
        onCancel={() => setDeleteUser(null)}
        loading={deleting}
      />
    </div>
  );
}
