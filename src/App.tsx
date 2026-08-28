import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { LiveCameras } from './components/cameras/LiveCameras';
import { CameraDetail } from './components/cameras/CameraDetail';
import { VehicleSearch } from './components/tracking/VehicleSearch';
import { VehicleProfile } from './components/tracking/VehicleProfile';
import { VehicleTracking } from './components/tracking/VehicleTracking';
import { Violations } from './components/violations/Violations';
import { ViolationInvestigationModal } from './components/violations/ViolationInvestigationModal';
import { CityMapPage } from './components/map/CityMapPage';
import { TrafficAnalytics } from './components/analytics/TrafficAnalytics';
import { AlertsPage } from './components/alerts/AlertsPage';
import { CameraManagement } from './components/camera-mgmt/CameraManagement';
import { ReportsPage } from './components/reports/ReportsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { trafficStore } from './services/trafficStore';
import { Camera, Vehicle, Violation, Alert, UserProfile } from './types';
import { AlertTriangle, X, Radio } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [trackingPlate, setTrackingPlate] = useState<string>('KA01AB1234');
  const [inspectedViolation, setInspectedViolation] = useState<Violation | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(trafficStore.getTheme());

  // Store Subscriptions
  const [cameras, setCameras] = useState<Camera[]>(trafficStore.getCameras());
  const [vehicles, setVehicles] = useState<Vehicle[]>(trafficStore.getVehicles());
  const [violations, setViolations] = useState<Violation[]>(trafficStore.getViolations());
  const [alerts, setAlerts] = useState<Alert[]>(trafficStore.getAlerts());
  const [watchlist, setWatchlist] = useState(trafficStore.getWatchlist());
  const [user, setUser] = useState<UserProfile>(trafficStore.getCurrentUser());
  const [stats, setStats] = useState(trafficStore.getDashboardStats());
  const [toast, setToast] = useState(trafficStore.getLatestToast());

  useEffect(() => {
    // Synchronize HTML element class
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = trafficStore.subscribe(() => {
      setCameras([...trafficStore.getCameras()]);
      setVehicles([...trafficStore.getVehicles()]);
      setViolations([...trafficStore.getViolations()]);
      setAlerts([...trafficStore.getAlerts()]);
      setWatchlist([...trafficStore.getWatchlist()]);
      setUser({ ...trafficStore.getCurrentUser() });
      setStats({ ...trafficStore.getDashboardStats() });
      setToast(trafficStore.getLatestToast());
      setTheme(trafficStore.getTheme());
    });
    return () => unsubscribe();
  }, []);

  const handleToggleTheme = () => {
    const next = trafficStore.toggleTheme();
    setTheme(next);
  };

  const handleDismissToast = () => {
    setToast(null);
    trafficStore.clearToast();
  };

  // Auto-dismiss toast after 10 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
        trafficStore.clearToast();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleNavigate = (tab: NavTab, meta?: any) => {
    setActiveTab(tab);
    if (meta?.camera) {
      setSelectedCamera(meta.camera);
    } else if (meta?.selectedCamera) {
      setSelectedCamera(meta.selectedCamera);
    } else if (meta?.selectedCameraCode) {
      const c = trafficStore.getCameraByCode(meta.selectedCameraCode);
      if (c) setSelectedCamera(c);
    } else {
      setSelectedCamera(null);
    }

    if (meta?.plate) {
      setTrackingPlate(meta.plate);
      const v = trafficStore.getVehicleByPlate(meta.plate);
      if (v) setSelectedVehicle(v);
    }

    if (meta?.query) {
      const v = trafficStore.getVehicleByPlate(meta.query);
      if (v) setSelectedVehicle(v);
    }
  };

  const handleSelectCamera = (camera: Camera) => {
    setSelectedCamera(camera);
    setActiveTab('cameras');
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setTrackingPlate(vehicle.plate);
  };

  const handleInspectViolation = (violation: Violation) => {
    setInspectedViolation(violation);
  };

  const activeAlertsCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const isDark = theme === 'dark';

  return (
    <div className={`flex h-screen overflow-hidden select-none transition-colors ${
      isDark ? 'bg-black text-white' : 'bg-white text-slate-900'
    }`}>
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'cameras') setSelectedCamera(null);
          if (tab === 'search') setSelectedVehicle(null);
        }} 
        activeAlertsCount={activeAlertsCount}
        theme={theme}
      />

      {/* Main Shell */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header 
          user={user} 
          alerts={alerts} 
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Dynamic Main Workspace Content */}
        <main className={`flex-1 overflow-y-auto transition-colors ${
          isDark ? 'bg-black' : 'bg-white'
        }`}>
          {activeTab === 'dashboard' && (
            <Dashboard 
              stats={stats}
              cameras={cameras}
              violations={violations}
              alerts={alerts}
              onNavigate={handleNavigate}
              onInspectViolation={handleInspectViolation}
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
          )}

          {activeTab === 'cameras' && (
            selectedCamera ? (
              <CameraDetail 
                camera={selectedCamera}
                onBack={() => setSelectedCamera(null)}
                onNavigate={handleNavigate}
                onInspectViolation={handleInspectViolation}
              />
            ) : (
              <LiveCameras 
                cameras={cameras}
                onSelectCamera={handleSelectCamera}
                onNavigate={handleNavigate}
              />
            )
          )}

          {activeTab === 'search' && (
            selectedVehicle ? (
              <VehicleProfile 
                vehicle={selectedVehicle}
                onBack={() => setSelectedVehicle(null)}
                onNavigate={handleNavigate}
                onInspectViolation={handleInspectViolation}
              />
            ) : (
              <VehicleSearch 
                onSelectVehicle={handleSelectVehicle}
                onNavigate={handleNavigate}
                initialQuery={trackingPlate}
              />
            )
          )}

          {activeTab === 'tracking' && (
            <VehicleTracking 
              initialPlate={trackingPlate}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'violations' && (
            <Violations 
              violations={violations}
              onInspectViolation={handleInspectViolation}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'map' && (
            <CityMapPage 
              cameras={cameras}
              onNavigate={handleNavigate}
              initialSelectedCamera={selectedCamera}
            />
          )}

          {activeTab === 'analytics' && (
            <TrafficAnalytics />
          )}

          {activeTab === 'alerts' && (
            <AlertsPage 
              alerts={alerts}
              watchlist={watchlist}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage />
          )}

          {activeTab === 'camera-mgmt' && (
            <CameraManagement 
              cameras={cameras}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Global Violation Investigation Adjudication Modal */}
      {inspectedViolation && (
        <ViolationInvestigationModal 
          violation={inspectedViolation}
          onClose={() => setInspectedViolation(null)}
          onNavigateToTracking={(plate) => {
            setTrackingPlate(plate);
            setActiveTab('tracking');
          }}
        />
      )}

      {/* Real-time Event Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 border-2 border-red-500/80 rounded-2xl p-4 shadow-2xl max-w-sm font-mono text-xs animate-in slide-in-from-bottom duration-300 ${
          isDark ? 'bg-neutral-950 text-white' : 'bg-white text-slate-900'
        }`}>
          <div className={`flex items-center justify-between pb-2 border-b ${
            isDark ? 'border-neutral-800' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-1.5 text-red-500 font-bold">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
              <span>{toast.title}</span>
            </div>
            <button
              type="button"
              onClick={handleDismissToast}
              className={`p-1.5 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer ${
                isDark 
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Dismiss Notification"
              aria-label="Dismiss Notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className={`mt-2 font-sans text-xs ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>{toast.message}</p>
          <div className="mt-3 flex items-center justify-end gap-2 font-sans">
            <button
              type="button"
              onClick={handleDismissToast}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isDark 
                  ? 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                const target = toast.targetPlate || 'KA01AB1234';
                handleDismissToast();
                handleNavigate('tracking', { plate: target });
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
            >
              Intercept Target
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
