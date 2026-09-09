import { useState, useEffect, useCallback } from 'react';
import { Alert, Violation } from '../types';
import { alertApi } from '../services/api';
import { trafficStore } from '../services/trafficStore';

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(trafficStore.getAlerts());
  const [violations, setViolations] = useState<Violation[]>(trafficStore.getViolations());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAlertsAndViolations = useCallback(async () => {
    setIsLoading(true);
    try {
      const [aRes, vRes] = await Promise.all([
        alertApi.getAlerts(),
        alertApi.getViolations()
      ]);
      setAlerts(aRes.data);
      setViolations(vRes.data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertsAndViolations();
    const unsubscribe = trafficStore.subscribe(() => {
      setAlerts([...trafficStore.getAlerts()]);
      setViolations([...trafficStore.getViolations()]);
    });
    return () => unsubscribe();
  }, [fetchAlertsAndViolations]);

  const acknowledgeAlert = async (id: string) => {
    await alertApi.acknowledgeAlert(id);
  };

  const resolveAlert = async (id: string) => {
    await alertApi.resolveAlert(id);
  };

  return {
    alerts,
    violations,
    isLoading,
    refreshAlerts: fetchAlertsAndViolations,
    acknowledgeAlert,
    resolveAlert
  };
}
