import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Shield, 
  ChevronDown, 
  AlertTriangle, 
  Clock, 
  X, 
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';
import { Alert, UserProfile } from '../../types';
import { NavTab } from './Sidebar';

interface HeaderProps {
  user: UserProfile;
  alerts: Alert[];
  onNavigate: (tab: NavTab, meta?: any) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  alerts,
  onNavigate,
  theme,
  onToggleTheme
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [dateString, setDateString] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('en-US', { hour12: false }));
      setDateString(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const topCriticalAlert = activeAlerts.find(a => a.type === 'Critical');
  const isDark = theme === 'dark';

  return (
    <header className={`h-14 px-5 flex items-center justify-between sticky top-0 z-20 select-none transition-colors border-b ${
      isDark 
        ? 'bg-black border-neutral-800 text-white' 
        : 'bg-white border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Left: Emergency Alert Ticker / System Status */}
      <div className="flex items-center gap-3 overflow-hidden max-w-xl">
        {topCriticalAlert ? (
          <div 
            onClick={() => onNavigate('alerts')}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono truncate cursor-pointer transition-colors border ${
              isDark 
                ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20' 
                : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
            <span className="font-bold shrink-0 text-red-400">[PRIORITY ALERT]</span>
            <span className="truncate">{topCriticalAlert.title}</span>
          </div>
        ) : (
          <div className={`text-xs font-medium hidden md:flex items-center gap-2 font-sans ${
            isDark ? 'text-neutral-400' : 'text-slate-500'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>Bangalore Traffic Control & Monitoring Center</span>
            <span className="text-neutral-600">•</span>
            <span className="font-mono text-[11px] text-neutral-400">50 Active Nodes</span>
          </div>
        )}
      </div>

      {/* Right: Theme Toggle + Clock + Alerts + Profile */}
      <div className="flex items-center gap-3">
        {/* Dark / Light Mode Switcher */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
            isDark 
              ? 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800 hover:text-white' 
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-xs'
          }`}
          title={`Switch to ${isDark ? 'Light Theme' : 'Dark Theme'}`}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Light Theme</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-neutral-800" />
              <span className="hidden sm:inline">Dark Theme</span>
            </>
          )}
        </button>

        {/* Live Clock */}
        <div className={`hidden lg:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl border ${
          isDark 
            ? 'bg-neutral-900 border-neutral-800 text-neutral-300' 
            : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          <span className={`font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>{timeString} IST</span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-400">{dateString}</span>
        </div>

        {/* Notifications Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-xl relative border transition-colors ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
            }`}
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            {activeAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-black" />
            )}
          </button>

          {/* Notifications Modal Dropdown */}
          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in-50 border ${
              isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex items-center justify-between pb-2.5 border-b ${
                isDark ? 'border-neutral-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold font-sans">Active Notifications</span>
                  <span className="px-2 py-0.5 bg-red-500/15 text-red-500 text-[10px] font-mono rounded-full font-bold">
                    {activeAlerts.length}
                  </span>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`divide-y max-h-72 overflow-y-auto mt-2 ${
                isDark ? 'divide-neutral-800' : 'divide-slate-100'
              }`}>
                {alerts.slice(0, 6).map(alt => (
                  <div key={alt.id} className={`py-2.5 px-2 rounded-xl transition-colors ${
                    isDark ? 'hover:bg-neutral-900' : 'hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className={`font-bold ${alt.type === 'Critical' ? 'text-red-500' : alt.type === 'Warning' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        ● {alt.type.toUpperCase()}
                      </span>
                      <span className="text-neutral-400 text-[10px]">{alt.timestamp}</span>
                    </div>
                    <p className={`text-xs font-semibold mt-1 font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>{alt.title}</p>
                    <p className={`text-[11px] mt-0.5 truncate font-sans ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{alt.description}</p>
                  </div>
                ))}
              </div>

              <div className={`pt-3 border-t mt-2 ${isDark ? 'border-neutral-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigate('alerts');
                  }}
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-neutral-700 shadow"
                >
                  <span>Open Alerts & Watchlist</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Government Operator Badge */}
        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${
          isDark 
            ? 'bg-neutral-900 border-neutral-800 text-white' 
            : 'bg-slate-100 border-slate-200 text-slate-900'
        }`}>
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-mono text-xs font-bold shadow-xs">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-tight font-sans">Government Operator</div>
            <div className={`text-[10px] font-mono font-semibold leading-tight ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              BTP TMC Desk #01
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
