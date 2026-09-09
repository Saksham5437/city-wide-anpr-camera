import { useState, useEffect, useCallback } from 'react';
import { DashboardStats } from '../types';
import { analyticsApi, HourlyTrafficItem } from '../services/api/analyticsApi';
import { trafficStore } from '../services/trafficStore';

export function useAnalytics() {
  const [stats, setStats] = useState<DashboardStats>(trafficStore.getDashboardStats());
  const [hourlyVolume, setHourlyVolume] = useState<HourlyTrafficItem[]>(
    trafficStore.getHourlyTrafficData('ALL')
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAnalytics = useCallback(async (cameraCode: string = 'ALL') => {
    setIsLoading(true);
    try {
      const [sRes, vRes] = await Promise.all([
        analyticsApi.getDashboardStats(),
        analyticsApi.getHourlyVolumeCurve(cameraCode)
      ]);
      setStats(sRes.data);
      setHourlyVolume(vRes.data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const unsubscribe = trafficStore.subscribe(() => {
      setStats(trafficStore.getDashboardStats());
      setHourlyVolume(trafficStore.getHourlyTrafficData('ALL'));
    });
    return () => unsubscribe();
  }, [fetchAnalytics]);

  return {
    stats,
    hourlyVolume,
    isLoading,
    refreshAnalytics: fetchAnalytics
  };
}
