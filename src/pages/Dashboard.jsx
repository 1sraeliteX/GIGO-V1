import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Moon, Sun, User, Filter, X, Clock, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CURRENCIES } from '../constants/currencies';
import { useCurrency } from '../context/CurrencyContext';
import { api } from '../services/api';
import { INSTRUMENTS_BY_CATEGORY, CATEGORY_LABELS, SUBCATEGORY_LABELS } from '../constants/instruments';
import StatCards from '../components/StatCards';
import CalendarGrid from '../components/CalendarGrid';
import WeeklyStats from '../components/WeeklyStats';
import QuoteSection from '../components/QuoteSection';
import TradeModal from '../components/TradeModal';
import DayDetail from '../components/DayDetail';
import TradeList from '../components/TradeList';
import SettingsModal from '../components/SettingsModal';
import AccountSwitcher from '../components/AccountSwitcher';
import SubscribeModal from '../components/SubscribeModal';

export default function Dashboard() {
  const { user, logout, subscription, subLoading, fetchSubscription } = useAuth();
  const { currency, formatMoney, setCurrencyCode } = useCurrency();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTradeList, setShowTradeList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [prefillDate, setPrefillDate] = useState(null);
  const [limitError, setLimitError] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingCapital, setOnboardingCapital] = useState('');
  const [onboardingCurrency, setOnboardingCurrency] = useState('USD');
  const [creating, setCreating] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');
  const [statsKey, setStatsKey] = useState(0);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const menuRef = useRef(null);
  const currencyRef = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    const handle = (e) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target)) {
        setShowCurrencyDropdown(false);
        setCurrencySearch('');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const loadAccounts = useCallback(async () => {
    try {
      const data = await api.accounts.list();
      setAccounts(data.accounts);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (accounts.length > 0 && selectedAccountId === null) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedDay(null);
  }, [selectedAccountId]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setOnboardingError('');
    if (!onboardingName.trim()) return;
    setCreating(true);
    try {
      setCurrencyCode(onboardingCurrency);
      const data = await api.accounts.create({ name: onboardingName.trim(), capital: parseFloat(onboardingCapital) || 0, currency: onboardingCurrency });
      await loadAccounts();
      setSelectedAccountId(data.id);
      setShowSubscribeModal(true);
    } catch (err) {
      setOnboardingError(err.message);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference');
    if (ref) {
      api.subscribe.verify(ref)
        .then(() => {
          fetchSubscription();
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (accountsLoaded && accounts.length > 0 && !subLoading && !subscription.subscribed) {
      setShowSubscribeModal(true);
    }
  }, [accountsLoaded, accounts, subLoading, subscription.subscribed]);

  useEffect(() => {
    if (subscription.subscribed && showSubscribeModal) {
      setShowSubscribeModal(false);
    }
  }, [subscription.subscribed, showSubscribeModal]);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const params = `month=${monthStr}${selectedAccountId ? `&account_id=${selectedAccountId}` : ''}`;
      const data = await api.trades.list(params);
      setTrades(data.trades);
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [monthStr, selectedAccountId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const handleSave = async (payload) => {
    if (editTrade) {
      await api.trades.update(editTrade.id, payload);
    } else {
      await api.trades.create(payload);
    }
    setEditTrade(null);
    setStatsKey(k => k + 1);
    await fetchTrades();
  };

  const handleEdit = (trade) => {
    setSelectedDay(null);
    setEditTrade(trade);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    await api.trades.delete(id);
    setStatsKey(k => k + 1);
    await fetchTrades();
  };

  const handleDayClick = (date) => {
    setSelectedDay(date);
  };

  const maxPerDay = selectedAccountId
    ? (accounts.find(a => a.id === selectedAccountId)?.max_trades_per_day ?? null)
    : null;

  const checkLimit = (date) => {
    if (!maxPerDay) return true;
    const count = trades.filter((t) => t.trade_date === date).length;
    if (count >= maxPerDay) {
      setLimitError(`Daily trade limit reached (${count}/${maxPerDay}). Adjust your limit in settings to add more.`);
      return false;
    }
    return true;
  };

  const handleDayAddTrade = (date) => {
    if (!checkLimit(date)) return;
    setLimitError('');
    setSelectedDay(null);
    setPrefillDate(date);
    setEditTrade(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditTrade(null);
    setPrefillDate(null);
  };

  const handleOpenAddTrade = () => {
    const today = new Date().toISOString().split('T')[0];
    if (!checkLimit(today)) return;
    setLimitError('');
    setPrefillDate(today);
    setEditTrade(null);
    setShowAddModal(true);
  };

  useEffect(() => {
    if (limitError) {
      const t = setTimeout(() => setLimitError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [limitError]);

  const filteredTrades = symbolFilter
    ? trades.filter((t) => t.pair?.toUpperCase() === symbolFilter.toUpperCase())
    : trades;
  const dayTrades = selectedDay ? filteredTrades.filter((t) => t.trade_date === selectedDay) : [];
  const accountCapital = selectedAccountId
    ? (accounts.find(a => a.id === selectedAccountId)?.capital || 0)
    : 0;

  const { theme, toggleTheme } = useTheme();

  return (
        <div className="min-h-screen bg-neutral-950">
      {accounts.length > 0 && (
        <header className="border-b border-neutral-800">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-6 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white shrink-0">GIGO</h1>
              <div className="min-w-0 max-w-[140px] sm:max-w-none">
                <AccountSwitcher
                  accounts={accounts}
                  selectedId={selectedAccountId}
                  onSelect={setSelectedAccountId}
                  onAccountsChange={loadAccounts}
                />
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              {!subLoading && subscription.subscribed && (
                <button
                  onClick={() => setShowSubscribeModal(true)}
                  className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg px-2 sm:px-3 py-1.5 transition-colors"
                  title="Upgrade subscription"
                >
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">{subscription.days_remaining}d left</span>
                  <span className="sm:hidden">{subscription.days_remaining}d</span>
                </button>
              )}
              <button onClick={toggleTheme}
                className="text-neutral-400 hover:text-white transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-neutral-800"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> : <Moon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
              </button>
              <button onClick={() => setShowSettings(true)}
                className="text-neutral-400 hover:text-white transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-neutral-800"
                title="Settings"
              >
                <Settings className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
              <div className="relative shrink-0" ref={menuRef}>
                <button onClick={() => setShowMenu(v => !v)}
                  className="ml-1 sm:ml-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-xs sm:text-sm font-bold text-white transition-colors"
                  title="Menu"
                >
                  {user?.name?.charAt(0)?.toUpperCase() || <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1.5 bg-neutral-800 border border-neutral-700 rounded-lg py-1 min-w-[200px] shadow-lg z-50">
                    <div className="px-4 py-2 text-sm text-neutral-400 border-b border-neutral-700">
                      {user?.name}
                      {user?.email ? <span className="block text-xs text-neutral-500 truncate">{user.email}</span> : null}
                    </div>
                    {subscription.subscribed && (
                      <div className="px-4 py-3 border-b border-neutral-700">
                        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
                          <span>{subscription.days_remaining} days left</span>
                          <span>{subscription.plan_type}</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (subscription.days_remaining / 30) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <button onClick={() => { setShowTradeList(true); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors">
                      Trades
                    </button>
                    <div className="border-t border-neutral-700" />
                    <button onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-neutral-700/50 transition-colors">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8 pb-16 sm:pb-8">
        {!accountsLoaded ? null : accounts.length === 0 ? (
          <div className="max-w-md mx-auto mt-16 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to GIGO</h2>
            <p className="text-neutral-400 mb-8">Create your first trading account to get started.</p>
            <form onSubmit={handleCreateAccount} className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 space-y-4 text-left">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Account Name</label>
                <input type="text" value={onboardingName} onChange={(e) => setOnboardingName(e.target.value)}
                  placeholder="e.g. Personal, Prop Firm, Demo"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" required />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Capital Amount</label>
                <div className="flex gap-2">
                  <div className="relative shrink-0" ref={currencyRef}>
                    <button type="button" onClick={() => setShowCurrencyDropdown(v => !v)}
                      className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-24">
                      <span className="truncate">{onboardingCurrency}</span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 ml-auto transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showCurrencyDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg w-64 max-h-60 overflow-hidden shadow-xl z-50">
                        <div className="p-2 border-b border-neutral-700">
                          <input type="text" value={currencySearch} onChange={(e) => setCurrencySearch(e.target.value)}
                            placeholder="Search currency..."
                            className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                            autoFocus />
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {CURRENCIES.filter(c =>
                            c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                            c.name.toLowerCase().includes(currencySearch.toLowerCase())
                          ).map(c => (
                            <button key={c.code} type="button" onClick={() => { setOnboardingCurrency(c.code); setShowCurrencyDropdown(false); setCurrencySearch(''); }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                                onboardingCurrency === c.code
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-white hover:bg-neutral-700/50'
                              }`}>
                              <span className="text-neutral-400 w-6">{c.symbol}</span>
                              <span className="font-medium">{c.code}</span>
                              <span className="text-neutral-500">— {c.name}</span>
                            </button>
                          ))}
                          {CURRENCIES.filter(c =>
                            c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                            c.name.toLowerCase().includes(currencySearch.toLowerCase())
                          ).length === 0 && (
                            <p className="px-3 py-4 text-sm text-neutral-500 text-center">No currencies found</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="number" step="0.01" min="0" value={onboardingCapital} onChange={(e) => setOnboardingCapital(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 min-w-0 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" required />
                </div>
              </div>
              {onboardingError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{onboardingError}</div>
              )}
              <button type="submit" disabled={creating}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 font-medium transition-colors disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={logout}
                className="w-full text-sm text-neutral-500 hover:text-red-400 transition-colors py-1">
                Logout
              </button>
            </form>
          </div>
        ) : (
          <>
            {limitError && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg p-3 text-sm text-center">
                {limitError}
              </div>
            )}
            <StatCards month={monthStr} accountId={selectedAccountId} accountCapital={accountCapital} refreshKey={statsKey} />

            <WeeklyStats trades={filteredTrades} accountCapital={accountCapital} accountId={selectedAccountId} year={year} month={month} />

            <div className="flex items-center gap-3 mb-4">
              {accountCapital > 0 && (
                <div className="flex items-center gap-1 sm:gap-3 bg-neutral-900 rounded-xl border border-neutral-800 px-4 sm:px-5 py-3 flex-1 min-w-0">
                  <span className="text-xs sm:text-sm text-neutral-400 shrink-0">Account Capital:</span>
                  <span className="text-base sm:text-lg font-bold text-white truncate">
                    {formatMoney(accountCapital)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Filter className="w-4 h-4 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={symbolFilter}
                    onChange={(e) => setSymbolFilter(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg pl-8 pr-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 max-w-[220px]"
                  >
                  <option value="">All Symbols</option>
                  {Object.entries(INSTRUMENTS_BY_CATEGORY).map(([category, groups]) =>
                    groups.map((group) => (
                      <optgroup key={`${category}-${group.subcategory}`} label={`${CATEGORY_LABELS[category]} — ${SUBCATEGORY_LABELS[group.subcategory]}`}>
                        {group.items.map((item) => (
                          <option key={item.symbol} value={item.symbol}>{item.label}</option>
                        ))}
                      </optgroup>
                    ))
                  )}
                </select>
              </div>
                {symbolFilter && (
                  <button onClick={() => setSymbolFilter('')}
                    className="text-neutral-500 hover:text-white transition-colors p-1">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <QuoteSection />

            <CalendarGrid
              year={year}
              month={month}
              trades={filteredTrades}
              onDayClick={handleDayClick}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              accountCapital={accountCapital}
            />
          </>
        )}
      </main>

      {accounts.length > 0 && (
        <button
          onClick={handleOpenAddTrade}
          className="fixed bottom-4 right-3 sm:bottom-8 sm:right-8 w-11 h-11 sm:w-14 sm:h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center text-lg sm:text-2xl transition-colors z-40"
        >
          +
        </button>
      )}

      {accounts.length > 0 && (
        <>
          <TradeModal
            isOpen={showAddModal}
            onClose={handleCloseModal}
            onSave={handleSave}
            trade={editTrade}
            prefillDate={prefillDate}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
          />

          <DayDetail
            date={selectedDay}
            trades={dayTrades}
            maxPerDay={maxPerDay}
            onClose={() => setSelectedDay(null)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddTrade={handleDayAddTrade}
            accountCapital={accountCapital}
          />

          <TradeList
            isOpen={showTradeList}
            onClose={() => setShowTradeList(false)}
            trades={trades}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddTrade={handleOpenAddTrade}
            accountCapital={accountCapital}
          />

          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            onAccountsChange={loadAccounts}
          />

          <SubscribeModal
            isOpen={showSubscribeModal}
            onClose={() => setShowSubscribeModal(false)}
            blocking={!subLoading && !subscription.subscribed}
          />
        </>
      )}
    </div>
  );
}
