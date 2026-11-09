import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, CreditCard, LayoutDashboard, LogOut, ShieldCheck, BarChart2, Sun, Moon, Settings, KeyRound, MessageCircle, Mail, HelpCircle, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import OnboardingTour, { ADMIN_STEPS } from '../../components/OnboardingTour';

const NAV = [
  { to: '/admin',               label: 'Overview',      icon: BarChart2,  end: true },
  { to: '/admin/users',         label: 'Users',         icon: Users },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/plans',         label: 'Plans',         icon: Settings },
  { to: '/admin/payments',      label: 'Payments',      icon: KeyRound },
  { to: '/admin/email',         label: 'Email',         icon: Mail },
  { to: '/admin/support',       label: 'Support Widget', icon: MessageCircle },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTour, setShowTour] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const currentLabel = NAV.find((item) => (item.end
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to)))?.label ?? 'Admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar: off-canvas below sm so the page content gets the full width on phones */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col transition-transform duration-200 ease-out sm:static sm:z-auto sm:w-56 sm:max-w-none sm:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Brand + theme toggle */}
        <div className="px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/logo.png" alt="Tradora" className="w-9 h-9 rounded-full object-cover shrink-0" />
              <span className="text-white font-bold text-sm tracking-wide truncate">Tradora</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setShowTour(true)}
                title="Take a tour"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                {theme === 'dark'
                  ? <Sun className="w-3.5 h-3.5" />
                  : <Moon className="w-3.5 h-3.5" />
                }
              </button>
              <button
                onClick={() => setNavOpen(false)}
                aria-label="Collapse menu"
                title="Collapse menu"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors sm:hidden"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-neutral-600 ml-6">Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" data-tour="admin-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="min-w-0 truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-neutral-800 space-y-1" data-tour="admin-exit">
          <NavLink
            to="/"
            onClick={() => setNavOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Back to Tradora
          </NavLink>
          <div className="px-3 py-2">
            <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-[#fff] transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile scrim */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 sm:hidden"
          aria-hidden="true"
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar — opens the menu once the sidebar is collapsed */}
        <div className="sm:hidden sticky top-0 z-30 flex items-center gap-2 bg-neutral-900 border-b border-neutral-800 px-3 py-2.5">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open admin menu"
            className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="flex-1 min-w-0 text-sm font-semibold text-white truncate text-center">{currentLabel}</p>
          <span className="w-9 shrink-0 flex items-center justify-center text-neutral-500">
            <ShieldCheck className="w-4 h-4" />
          </span>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>

      <OnboardingTour
        isOpen={showTour}
        steps={ADMIN_STEPS}
        onComplete={() => setShowTour(false)}
        onSkip={() => setShowTour(false)}
      />
    </div>
  );
}
