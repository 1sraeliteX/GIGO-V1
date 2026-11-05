import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, BarChart2, List, Grid, TrendingUp, Settings2, Filter, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import GrindTable    from '../components/grind/GrindTable';
import BalanceLog    from '../components/grind/BalanceLog';
import BalanceGrid   from '../components/grind/BalanceGrid';
import BalanceChart  from '../components/grind/BalanceChart';
import StatsPanel, { LookupPanel } from '../components/grind/StatsPanel';
import GrindSettings from '../components/grind/GrindSettings';

const TABS = [
  { id: 'table',  label: 'Grind Table',  icon: Grid },
  { id: 'log',    label: 'Balance Log',  icon: List },
  { id: 'grid',   label: 'Balance',      icon: BarChart2 },
  { id: 'chart',  label: 'Chart',        icon: TrendingUp },
  { id: 'stats',  label: 'Stats',        icon: Settings2 },
];

export default function GrindReport() {
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const [tab, setTab]    = useState('table');
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [accounts, setAccounts]       = useState([]);

  // Filters
  const [accountId, setAccountId] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  // Ref to keep latest fetch params for refresh after settings change
  const paramsRef = useRef({});

  const fetchReport = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    paramsRef.current = params;
    try {
      const data = await api.grind.getReport(params);
      setReport(data);
    } catch (ex) {
      setError(ex.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load accounts for filter dropdown
  useEffect(() => {
    api.accounts.list()
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setAccounts([]));
  }, []);

  // Initial load
  useEffect(() => {
    fetchReport(buildParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildParams() {
    return {
      ...(accountId ? { account_id: accountId } : {}),
      ...(dateFrom  ? { date_from: dateFrom }   : {}),
      ...(dateTo    ? { date_to: dateTo }        : {}),
    };
  }

  const handleApplyFilters = () => {
    fetchReport(buildParams());
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setAccountId('');
    setDateFrom('');
    setDateTo('');
    fetchReport({});
    setShowFilters(false);
  };

  const handleSettingsChange = () => {
    // Re-fetch with current params after settings saved
    fetchReport(paramsRef.current);
  };

  const isFiltered = accountId || dateFrom || dateTo;

  const settings     = report?.settings ?? {};
  const startBalance = settings.start_balance ?? 1000;

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 sticky top-0 z-30 bg-neutral-950/95 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-800 shrink-0"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white">Grind Report</h1>
            {report && (
              <p className="text-xs text-neutral-500 mt-0.5 hidden sm:block">
                {report.stats?.total ?? 0} trades · {report.markets?.length ?? 0} markets ·{' '}
                ${report.stats?.final_balance != null ? Number(report.stats.final_balance).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Filter button */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                isFiltered
                  ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-400'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters{isFiltered ? ' ✓' : ''}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchReport(buildParams())}
              disabled={loading}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-40"
              title="Refresh report"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="border-t border-neutral-800 bg-neutral-900/80 backdrop-blur px-4 sm:px-6 py-4">
            <div className="max-w-[1600px] mx-auto flex flex-wrap items-end gap-3">
              {accounts.length > 0 && (
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">All accounts</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-neutral-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors"
              >
                Apply
              </button>
              {isFiltered && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-t border-neutral-800">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 flex overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* Settings panel (always visible at top) */}
        <GrindSettings onSettingsChange={handleSettingsChange} />

        {/* Loading / error states */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3 text-neutral-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Computing report…</span>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && report && (
          <>
            {tab === 'table' && (
              <GrindTable markets={report.markets ?? []} />
            )}

            {tab === 'log' && (
              <BalanceLog
                log={report.log}
                logChrono={report.log_chrono}
                startBalance={startBalance}
              />
            )}

            {tab === 'grid' && (
              <BalanceGrid
                grid={report.grid ?? []}
                startBalance={startBalance}
                stats={report.stats}
              />
            )}

            {tab === 'chart' && (
              <BalanceChart
                log={report.log}
                settings={settings}
                stats={report.stats}
              />
            )}

            {tab === 'stats' && (
              <div className="space-y-6">
                <StatsPanel stats={report.stats} startBalance={startBalance} />
                <LookupPanel log={report.log} startBalance={startBalance} />
              </div>
            )}
          </>
        )}

        {!loading && !error && !report && (
          <div className="text-center py-20 text-neutral-500 text-sm">
            No report data available.
          </div>
        )}
      </main>
    </div>
  );
}
