import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Camera, Vehicle, Detection, Alert, Violation, DashboardStats, UserProfile } from '../types';
import { trafficStore } from '../services/trafficStore';
import { useCameras } from '../hooks/useCameras';
import { useVehicles } from '../hooks/useVehicles';
import { useDetections } from '../hooks/useDetections';
import { useAlerts } from '../hooks/useAlerts';
import { useAnalytics } from '../hooks/useAnalytics';

interface TrafficContextType {
  cameras: Camera[];
  vehicles: Vehicle[];
  detections: Detection[];
  alerts: Alert[];
  violations: Violation[];
  stats: DashboardStats;
  currentUser: UserProfile;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

const TrafficContext = createContext<TrafficContextType | undefined>(undefined);

export const TrafficProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cameras } = useCameras();
  const { vehicles } = useVehicles();
  const { detections } = useDetections();
  const { alerts, violations } = useAlerts();
  const { stats } = useAnalytics();
  
  const [currentUser, setCurrentUser] = useState<UserProfile>(trafficStore.getCurrentUser());
  const [theme, setThemeState] = useState<'dark' | 'light'>(trafficStore.getTheme());

  useEffect(() => {
    const unsub = trafficStore.subscribe(() => {
      setCurrentUser(trafficStore.getCurrentUser());
      setThemeState(trafficStore.getTheme());
    });
    return () => unsub();
  }, []);

  const setTheme = (t: 'dark' | 'light') => {
    trafficStore.setTheme(t);
    setThemeState(t);
  };

  const toggleTheme = () => {
    const next = trafficStore.toggleTheme();
    setThemeState(next);
  };

  const value = useMemo(() => ({
    cameras,
    vehicles,
    detections,
    alerts,
    violations,
    stats,
    currentUser,
    theme,
    setTheme,
    toggleTheme
  }), [cameras, vehicles, detections, alerts, violations, stats, currentUser, theme]);

  return (
    <TrafficContext.Provider value={value}>
      {children}
    </TrafficContext.Provider>
  );
};

export function useTrafficContext(): TrafficContextType {
  const context = useContext(TrafficContext);
  if (!context) {
    throw new Error('useTrafficContext must be used within a TrafficProvider');
  }
  return context;
}
