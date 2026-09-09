import { useState, useEffect, useCallback } from 'react';
import { Camera, CameraStatus } from '../types';
import { cameraApi } from '../services/api';
import { trafficStore } from '../services/trafficStore';

export function useCameras() {
  const [cameras, setCameras] = useState<Camera[]>(trafficStore.getCameras());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await cameraApi.getAllCameras();
      setCameras(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cameras');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
    const unsubscribe = trafficStore.subscribe(() => {
      setCameras([...trafficStore.getCameras()]);
    });
    return () => unsubscribe();
  }, [fetchCameras]);

  const updateStatus = async (code: string, status: CameraStatus) => {
    await cameraApi.updateCameraStatus(code, status);
  };

  return {
    cameras,
    isLoading,
    error,
    refreshCameras: fetchCameras,
    updateStatus
  };
}
