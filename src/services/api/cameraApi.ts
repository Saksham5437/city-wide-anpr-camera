import { apiClient, ApiResponse } from './apiClient';
import { Camera, CameraStatus } from '../../types';
import { trafficStore } from '../trafficStore';

export const cameraApi = {
  async getAllCameras(): Promise<ApiResponse<Camera[]>> {
    return apiClient.get<Camera[]>('cameras', () => trafficStore.getCameras());
  },

  async getCameraByCode(code: string): Promise<ApiResponse<Camera | null>> {
    return apiClient.get<Camera | null>(`cameras/${code}`, () => trafficStore.getCameraByCode(code) || null);
  },

  async updateCameraStatus(code: string, status: CameraStatus): Promise<ApiResponse<Camera | null>> {
    return apiClient.put<Camera | null>(`cameras/${code}/status`, { status }, () => {
      trafficStore.updateCameraStatus(code, status);
      return trafficStore.getCameraByCode(code) || null;
    });
  },

  async updateCameraDetails(code: string, updates: Partial<Camera>): Promise<ApiResponse<Camera | null>> {
    return apiClient.put<Camera | null>(`cameras/${code}`, updates, () => {
      const cam = trafficStore.getCameraByCode(code);
      if (cam) Object.assign(cam, updates);
      return cam || null;
    });
  },

  async addCamera(camera: Camera): Promise<ApiResponse<Camera>> {
    return apiClient.post<Camera>('cameras', camera, () => {
      trafficStore.addCamera(camera);
      return camera;
    });
  }
};
