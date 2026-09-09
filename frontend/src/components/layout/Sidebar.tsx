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
  UploadCloud
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'cameras'
  | 'video-anpr'
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
    { id: 'video-anpr', label: 'Video ANPR Lab', icon: UploadCloud },
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
        isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50/80 border-slate-200'
      }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-sm transition-transform ${
          isDark 
            ? 'bg-neutral-900 border border-neutral-700 text-emerald-400' 
            : 'bg-slate-900 text-emerald-400 shadow-slate-900/10'
        }`}>
          <Cpu className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-black tracking-wider font-mono text-white">CITYWATCH</h1>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className={`text-[11px] font-medium truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
            Urban Traffic Intelligence
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto">
        <div className={`text-[10px] font-mono uppercase tracking-wider px-3 pb-1 font-semibold ${
          isDark ? 'text-neutral-500' : 'text-slate-400'
        }`}>
          Navigation
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group relative ${
                isActive
                  ? isDark
                    ? 'bg-neutral-900 text-white font-semibold border border-neutral-700 shadow-xs'
                    : 'bg-slate-900 text-white font-semibold shadow-xs'
                  : isDark
                    ? 'text-neutral-400 hover:bg-neutral-950 hover:text-white border border-transparent'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors shrink-0 ${
                  isActive 
                    ? 'text-emerald-400' 
                    : isDark ? 'text-neutral-500 group-hover:text-neutral-300' : 'text-slate-400 group-hover:text-slate-700'
                }`} />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge !== undefined && item.badge > 0 && !isActive && (
                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" />
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className={`p-3.5 border-t text-[11px] font-mono flex items-center justify-between ${
        isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
      }`}>
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50 animate-pulse shrink-0" />
          <span className={`font-semibold truncate ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
            BTP Command Grid
          </span>
        </div>
        <span className="text-[10px] text-neutral-500 shrink-0">v2.6</span>
      </div>
    </aside>
  );
};
