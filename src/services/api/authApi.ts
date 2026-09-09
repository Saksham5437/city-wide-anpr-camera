import { apiClient, ApiResponse } from './apiClient';
import { UserProfile } from '../../types';
import { trafficStore } from '../trafficStore';

export const authApi = {
  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<UserProfile>('auth/me', () => trafficStore.getCurrentUser());
  },

  async switchRole(role: UserProfile['role']): Promise<ApiResponse<UserProfile>> {
    return apiClient.post<UserProfile>('auth/switch-role', { role }, () => {
      trafficStore.switchUserRole(role);
      return trafficStore.getCurrentUser();
    });
  }
};
