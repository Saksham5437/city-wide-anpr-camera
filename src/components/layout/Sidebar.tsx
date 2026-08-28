import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Search, 
  Route, 
  ShieldAlert, 
  Map, 
  BarChart3, 
  Bell, 
  FileText, 
  Sliders, 
  Settings,
  Cpu,
  Radio,
  Layers,
  Activity
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'cameras'
  | 'search'
  | 'tracking'
  | 'violations'
  | 'map'
  | 'analytics'
  | 'alerts'
  | 'reports'
  | 'camera-mgmt'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeAlertsCount: number;
  theme?: 'dark' | 'light';
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeAlertsCount,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cameras', label: 'Live CCTV Cameras', icon: Video },
    { id: 'search', label: 'Vehicle Search', icon: Search },
    { id: 'tracking', label: 'Vehicle Tracking', icon: Route },
    { id: 'violations', label: 'Violations', icon: ShieldAlert },
    { id: 'map', label: 'City Map', icon: Map },
    { id: 'analytics', label: 'Traffic Analytics', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts & Watchlist', icon: Bell, badge: activeAlertsCount },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'camera-mgmt', label: 'Camera Mgmt', icon: Sliders },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className={`w-64 border-r flex flex-col shrink-0 h-screen sticky top-0 select-none z-30 transition-colors ${
      isDark 
        ? 'bg-black border-neutral-800 text-white' 
        : 'bg-white border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Brand Header */}
      <div className={`p-4 border-b flex items-center gap-3 ${
        isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
          isDark ? 'bg-neutral-900 border border-neutral-700' : 'bg-slate-900'
        }`}>
          <Cpu className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-wider font-mono">CITYWATCH</h1>
          <p className={`text-[11px] font-medium truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
            Urban Traffic Intelligence
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 relative ${
                isActive
                  ? isDark
                    ? 'bg-neutral-900 text-white font-bold border border-neutral-700 shadow-sm'
                    : 'bg-slate-900 text-white font-bold shadow-sm'
                  : isDark
                    ? 'text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-100 border border-transparent'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${
                  isActive 
                    ? 'text-emerald-400' 
                    : isDark ? 'text-neutral-500' : 'text-slate-400'
                }`} />
                <span>{item.label}</span>
              </div>

              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs" />
              )}

              {item.badge !== undefined && item.badge > 0 && !isActive && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-500/15 text-red-500 border border-red-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className={`p-3.5 border-t text-[11px] font-mono flex items-center justify-between ${
        isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-400' : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className={`font-semibold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
            Bengaluru Traffic Control
          </span>
        </div>
      </div>
    </aside>
  );
};
