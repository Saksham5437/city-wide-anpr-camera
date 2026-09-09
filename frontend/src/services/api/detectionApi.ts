import { apiClient, ApiResponse } from './apiClient';
import { Detection, VideoDetection } from '../../types';
import { trafficStore } from '../trafficStore';

export const detectionApi = {
  async getRecentDetections(limit: number = 50): Promise<ApiResponse<Detection[]>> {
    return apiClient.get<Detection[]>(`detections?limit=${limit}`, () => {
      return trafficStore.getDetections().slice(0, limit);
    });
  },

  async getDetectionsByCamera(cameraCode: string): Promise<ApiResponse<Detection[]>> {
    return apiClient.get<Detection[]>(`detections/camera/${cameraCode}`, () => {
      return trafficStore.getDetectionsByCamera(cameraCode);
    });
  },

  async getDetectionsByPlate(plate: string): Promise<ApiResponse<Detection[]>> {
    return apiClient.get<Detection[]>(`detections/plate/${encodeURIComponent(plate)}`, () => {
      return trafficStore.getDetectionsByVehicle(plate);
    });
  },

  async recordVideoDetection(
    detection: VideoDetection,
    cameraCode?: string,
    cameraName?: string
  ): Promise<ApiResponse<Detection>> {
    return apiClient.post<Detection>('detections', { detection, cameraCode, cameraName }, () => {
      return trafficStore.recordVideoDetection(detection, cameraCode, cameraName);
    });
  }
};
