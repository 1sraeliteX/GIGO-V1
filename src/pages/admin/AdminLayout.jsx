import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, CreditCard, LayoutDashboard, LogOut, ShieldCheck, BarChart2, Sun, Moon, Settings, KeyRound, MessageCircle, Mail, HelpCircle } from 'lucide-react';
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
  const [showTour, setShowTour] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col">

        {/* Brand + theme toggle */}
        <div className="px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Tradora" className="w-9 h-9 rounded-full object-cover shrink-0" />
              <span className="text-white font-bold text-sm tracking-wide">Tradora</span>
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
            </div>
          </div>
          <p className="text-[10px] text-neutral-600 ml-6">Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1" data-tour="admin-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-neutral-800 space-y-1" data-tour="admin-exit">
          <NavLink
            to="/"
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
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-[#fff] transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <OnboardingTour
        isOpen={showTour}
        steps={ADMIN_STEPS}
        onComplete={() => setShowTour(false)}
        onSkip={() => setShowTour(false)}
      />
    </div>
  );
}
