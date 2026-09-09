import { useState, useEffect, useCallback } from 'react';
import { Vehicle, TrajectoryRoute, WatchlistItem } from '../types';
import { vehicleApi } from '../services/api';
import { trafficStore } from '../services/trafficStore';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(trafficStore.getVehicles());
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(trafficStore.getWatchlist());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vRes, wRes] = await Promise.all([
        vehicleApi.getAllVehicles(),
        vehicleApi.getWatchlist()
      ]);
      setVehicles(vRes.data);
      setWatchlist(wRes.data);
    } catch {
      // Fallback already handled in api client
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    const unsubscribe = trafficStore.subscribe(() => {
      setVehicles([...trafficStore.getVehicles()]);
      setWatchlist([...trafficStore.getWatchlist()]);
    });
    return () => unsubscribe();
  }, [fetchVehicles]);

  const getVehicleTrajectory = async (plate: string): Promise<TrajectoryRoute | null> => {
    const res = await vehicleApi.getVehicleTrajectory(plate);
    return res.data;
  };

  const addToWatchlist = async (item: Omit<WatchlistItem, 'id' | 'addedDate' | 'flaggedSightings'>) => {
    await vehicleApi.addToWatchlist(item);
  };

  return {
    vehicles,
    watchlist,
    isLoading,
    refreshVehicles: fetchVehicles,
    getVehicleTrajectory,
    addToWatchlist
  };
}
