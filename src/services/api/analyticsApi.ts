import { apiClient, ApiResponse } from './apiClient';
import { DashboardStats } from '../../types';
import { trafficStore } from '../trafficStore';

export interface HourlyTrafficItem {
  hourIndex: number;
  hourLabel: string;
  hour24: string;
  timeRange: string;
  volume: number;
  avgSpeed: number;
  isCurrentHour: boolean;
  isPeak: boolean;
}

export const analyticsApi = {
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return apiClient.get<DashboardStats>('analytics/stats', () => trafficStore.getDashboardStats());
  },

  async getHourlyVolumeCurve(cameraCode: string = 'ALL'): Promise<ApiResponse<HourlyTrafficItem[]>> {
    return apiClient.get<HourlyTrafficItem[]>(`analytics/volume/${cameraCode}`, () => {
      return trafficStore.getHourlyTrafficData(cameraCode);
    });
  }
};
