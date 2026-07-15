import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { 
  LayoutDashboard, 
  FileText, 
  Sparkles, 
  MessageSquare, 
  BarChart3, 
  LogOut,
  User as UserIcon,
  Activity,
  GitCompare
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/library', label: 'Content Studio', icon: FileText },
    { to: '/workspace', label: 'AEO Workspace', icon: Sparkles },
    { to: '/ai-intelligence', label: 'AI Intelligence Center', icon: Activity },
    { to: '/compare', label: 'AI Visibility Compare', icon: GitCompare },
    { to: '/chat', label: 'Ask Your Content', icon: MessageSquare },
    { to: '/analytics', label: 'Deep Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 border-r border-border/60 bg-neutral-950 flex flex-col h-screen shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-border/40 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Sparkles className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white font-display">AEOlytics</h1>
          <span className="text-[10px] text-muted tracking-wider uppercase font-semibold font-display">AEO Platform</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-neutral-900 text-white font-medium border border-border/40'
                  : 'text-muted hover:text-white hover:bg-neutral-900/40'
              }`
            }
          >
            {({ isActive }) => {
              const Icon = item.icon;
              return (
                <>
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-accent' : 'text-current'}`} />
                  <span>{item.label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>

      {/* Profile & Logout Section */}
      <div className="p-4 border-t border-border/40 flex flex-col gap-3 bg-neutral-950/40">
        {user ? (
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <UserIcon className="w-4.5 h-4.5 text-accent" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate font-display">{user.name}</p>
              <p className="text-[10px] text-muted truncate">{user.role}</p>
            </div>
          </div>
        ) : null}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};
