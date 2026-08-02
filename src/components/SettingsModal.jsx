import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, User, Briefcase, Hash, Palette, DollarSign, Globe } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTradeColors } from '../context/TradeColorContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTimezone } from '../context/TimezoneContext';
import { useToast } from '../context/ToastContext';
import { SESSIONS, getSessionLocalTime, TIMEZONE_OPTIONS } from '../constants/sessions';
import CurrencyPicker from './CurrencyPicker';

const WIN_PRESETS = ['#10b981', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b'];
const LOSS_PRESETS = ['#ef4444', '#f97316', '#e11d48', '#ec4899', '#a855f7', '#64748b'];

export default function SettingsModal({ isOpen, onClose, onAccountsChange }) {
  const { user, updateUser } = useAuth();
  const { colors, updateColors } = useTradeColors();
  const { currency, currencyCode, setCurrencyCode } = useCurrency();
  const { timezone, setTimezone } = useTimezone();
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [accounts, setAccounts] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCapital, setFormCapital] = useState('');
  const [formLimit, setFormLimit] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      setMessage('');
      setError('');
      loadAccounts();
    }
  }, [isOpen, user]);

  const loadAccounts = async () => {
    try {
      const data = await api.accounts.list();
      setAccounts(data.accounts);
    } catch {
      setAccounts([]);
    }
  };

  if (!isOpen) return null;

  const resetForm = () => {
    setShowForm(false);
    setEditingAccount(null);
    setFormName('');
    setFormCapital('');
    setFormLimit('');
  };

  const handleAddAccount = async () => {
    if (!formName.trim()) return;
    try {
      const payload = {
        name: formName.trim(),
        capital: parseFloat(formCapital) || 0,
      };
      const parsedLimit = formLimit === '' ? null : parseInt(formLimit, 10);
      if (parsedLimit !== null && (isNaN(parsedLimit) || parsedLimit < 1)) {
        setError('Max Trades Per Day must be a positive number or empty.');
        return;
      }
      if (parsedLimit !== null) payload.max_trades_per_day = parsedLimit;

      if (editingAccount) {
        await api.accounts.update(editingAccount.id, payload);
        success('Account updated');
      } else {
        await api.accounts.create(payload);
        success('Account created');
      }
      resetForm();
      await loadAccounts();
      onAccountsChange?.();
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleDeleteAccount = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.accounts.delete(deleteConfirm);
      success('Account deleted');
      setDeleteConfirm(null);
      await loadAccounts();
      onAccountsChange?.();
    } catch (err) {
      toastError(err.message);
      setDeleteConfirm(null);
    }
  };

  const startEdit = (account) => {
    setEditingAccount(account);
    setFormName(account.name);
    setFormCapital(String(account.capital || ''));
    setFormLimit(account.max_trades_per_day != null ? String(account.max_trades_per_day) : '');
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto relative">
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Settings</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Manage your profile and trading accounts</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>
          )}
          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg p-3 text-sm">{message}</div>
          )}

          {user && (
            <div className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Trading Accounts</h3>
              <div className="flex-1" />
              <span className="text-xs text-neutral-500">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
            </div>

            {showForm && (
              <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4 mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">
                    {editingAccount ? 'Edit Account' : 'New Account'}
                  </span>
                  <button onClick={resetForm} className="text-neutral-500 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Account Name</label>
                  <input
                    type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Personal, Prop Firm, Demo"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-neutral-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Capital ({currency.symbol})</label>
                    <input
                      type="text" inputMode="decimal" value={formCapital} onChange={(e) => setFormCapital(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-neutral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Max Trades / Day</label>
                    <input
                      type="text" inputMode="numeric" value={formLimit} onChange={(e) => setFormLimit(e.target.value)}
                      placeholder="No limit"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-neutral-600"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={resetForm}
                    className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleAddAccount}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                    {editingAccount ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            )}

            {accounts.length === 0 && !showForm && (
              <div className="text-center py-8 bg-neutral-800/30 rounded-xl border border-dashed border-neutral-700/50">
                <Briefcase className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">No accounts yet</p>
                <p className="text-xs text-neutral-600 mt-1">Add one to track separate trading accounts.</p>
              </div>
            )}

            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-3.5 flex items-center justify-between group hover:border-neutral-600 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600/10 flex items-center justify-center shrink-0">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-white">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-9">
                      {a.capital > 0 && (
                        <span className="text-xs text-neutral-400">
                          {currency.symbol}{Number(a.capital).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {a.max_trades_per_day != null && (
                        <span className="text-xs text-neutral-500">max {a.max_trades_per_day}/day</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity sm:flex">
                    <button onClick={() => startEdit(a)}
                      className="p-2 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-neutral-700">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteAccount(a.id)}
                      className="p-2 text-neutral-500 hover:text-red-400 transition-colors rounded-lg hover:bg-neutral-700">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!showForm && (
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl border border-dashed border-emerald-500/20 hover:border-emerald-500/40 py-3 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Account
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Trade Colors</h3>
            </div>
            <div className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-4 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Win Day Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={colors.win}
                    onChange={(e) => updateColors({ win: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-600 bg-transparent"
                  />
                  <div className="flex gap-1.5">
                    {WIN_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateColors({ win: c })}
                        className={`w-7 h-7 rounded-lg border-2 transition-all ${
                          colors.win === c ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Loss Day Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={colors.loss}
                    onChange={(e) => updateColors({ loss: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-600 bg-transparent"
                  />
                  <div className="flex gap-1.5">
                    {LOSS_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateColors({ loss: c })}
                        className={`w-7 h-7 rounded-lg border-2 transition-all ${
                          colors.loss === c ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Currency</h3>
            </div>
            <div className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-4">
              <CurrencyPicker
                value={currencyCode}
                onChange={setCurrencyCode}
              />
              <p className="text-[10px] text-neutral-500 mt-2">
                Preview: {currency.symbol}1,234.56
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Timezone</h3>
            </div>
            <div className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-4 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Your local timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {Array.from(new Set(TIMEZONE_OPTIONS.map((t) => t.group))).map((group) => (
                    <optgroup key={group} label={group}>
                      {TIMEZONE_OPTIONS.filter((t) => t.group === group).map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-500 mt-2">
                  Session open/close times in your trade form will reflect this timezone.
                </p>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Session hours in your timezone</label>
                <div className="space-y-2">
                  {SESSIONS.map((s) => (
                    <div key={s.key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-neutral-300">{s.emoji} {s.label}</span>
                      </span>
                      <span className="text-neutral-500 font-mono">
                        {getSessionLocalTime(s.key, timezone)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {deleteConfirm && (
          <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center z-10">
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6 mx-4 w-full max-w-xs text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-white mb-1">Delete Account?</p>
              <p className="text-xs text-neutral-400 mb-5">
                This will permanently delete this account and all its trades.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                >
                  No
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
