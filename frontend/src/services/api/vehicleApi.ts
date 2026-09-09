import { apiClient, ApiResponse } from './apiClient';
import { Vehicle, TrajectoryRoute, WatchlistItem } from '../../types';
import { trafficStore } from '../trafficStore';

export const vehicleApi = {
  async getAllVehicles(): Promise<ApiResponse<Vehicle[]>> {
    return apiClient.get<Vehicle[]>('vehicles', () => trafficStore.getVehicles());
  },

  async getVehicleByPlate(plate: string): Promise<ApiResponse<Vehicle | null>> {
    return apiClient.get<Vehicle | null>(`vehicles/${encodeURIComponent(plate)}`, () => trafficStore.getVehicleByPlate(plate) || null);
  },

  async getVehicleTrajectory(plate: string): Promise<ApiResponse<TrajectoryRoute | null>> {
    return apiClient.get<TrajectoryRoute | null>(`vehicles/${encodeURIComponent(plate)}/trajectory`, () => trafficStore.getVehicleTrajectory(plate) || null);
  },

  async getWatchlist(): Promise<ApiResponse<WatchlistItem[]>> {
    return apiClient.get<WatchlistItem[]>('vehicles/watchlist', () => trafficStore.getWatchlist());
  },

  async addToWatchlist(item: Omit<WatchlistItem, 'id' | 'addedDate' | 'flaggedSightings'>): Promise<ApiResponse<WatchlistItem>> {
    return apiClient.post<WatchlistItem>('vehicles/watchlist', item, () => {
      trafficStore.addToWatchlist(item);
      const created = trafficStore.getWatchlist().find(w => w.plate === item.plate);
      return created || {
        ...item,
        id: `wl-fallback-${Date.now()}`,
        addedDate: new Date().toISOString().split('T')[0],
        flaggedSightings: 0
      };
    });
  },

  async updateVehicleDetails(plate: string, updates: Partial<Vehicle>): Promise<ApiResponse<Vehicle | null>> {
    return apiClient.put<Vehicle | null>(`vehicles/${encodeURIComponent(plate)}`, updates, () => {
      return trafficStore.updateVehicleDetails(plate, updates);
    });
  }
};
