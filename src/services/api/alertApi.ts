import { apiClient, ApiResponse } from './apiClient';
import { Alert, Violation } from '../../types';
import { trafficStore } from '../trafficStore';

export const alertApi = {
  async getAlerts(): Promise<ApiResponse<Alert[]>> {
    return apiClient.get<Alert[]>('alerts', () => trafficStore.getAlerts());
  },

  async acknowledgeAlert(alertId: string): Promise<ApiResponse<Alert | null>> {
    return apiClient.put<Alert | null>(`alerts/${alertId}/acknowledge`, {}, () => {
      trafficStore.acknowledgeAlert(alertId);
      return trafficStore.getAlerts().find(a => a.id === alertId) || null;
    });
  },

  async resolveAlert(alertId: string): Promise<ApiResponse<Alert | null>> {
    return apiClient.put<Alert | null>(`alerts/${alertId}/resolve`, {}, () => {
      trafficStore.resolveAlert(alertId);
      return trafficStore.getAlerts().find(a => a.id === alertId) || null;
    });
  },

  async getViolations(): Promise<ApiResponse<Violation[]>> {
    return apiClient.get<Violation[]>('violations', () => trafficStore.getViolations());
  },

  async updateViolationStatus(violationId: string, status: any): Promise<ApiResponse<Violation | null>> {
    return apiClient.put<Violation | null>(`violations/${violationId}/status`, { status }, () => {
      trafficStore.updateViolationStatus(violationId, status);
      return trafficStore.getViolations().find(v => v.id === violationId) || null;
    });
  }
};
