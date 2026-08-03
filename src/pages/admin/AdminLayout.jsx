import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, CreditCard, LayoutDashboard, LogOut, ShieldCheck, BarChart2, Sun, Moon, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV = [
  { to: '/admin',               label: 'Overview',      icon: BarChart2,  end: true },
  { to: '/admin/users',         label: 'Users',         icon: Users },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/plans',         label: 'Plans',         icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

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
              <img src="/logo.png" alt="Wealthalliance" className="w-9 h-9 rounded-full object-cover shrink-0" />
              <span className="text-white font-bold text-sm tracking-wide">Wealthalliance</span>
            </div>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
            >
              {theme === 'dark'
                ? <Sun className="w-3.5 h-3.5" />
                : <Moon className="w-3.5 h-3.5" />
              }
            </button>
          </div>
          <p className="text-[10px] text-neutral-600 ml-6">Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
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
        <div className="px-3 py-4 border-t border-neutral-800 space-y-1">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Back to Wealthalliance
          </NavLink>
          <div className="px-3 py-2">
            <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-neutral-800 transition-colors"
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
    </div>
  );
}
