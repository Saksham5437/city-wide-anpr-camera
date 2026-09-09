import { useState, useEffect, useCallback } from 'react';
import { Detection, VideoDetection } from '../types';
import { detectionApi } from '../services/api';
import { trafficStore } from '../services/trafficStore';

export function useDetections(limit: number = 50) {
  const [detections, setDetections] = useState<Detection[]>(trafficStore.getDetections().slice(0, limit));
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchDetections = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await detectionApi.getRecentDetections(limit);
      setDetections(res.data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchDetections();
    const unsubscribe = trafficStore.subscribe(() => {
      setDetections([...trafficStore.getDetections().slice(0, limit)]);
    });
    return () => unsubscribe();
  }, [fetchDetections, limit]);

  const recordDetection = async (det: VideoDetection, cameraCode?: string, cameraName?: string) => {
    return detectionApi.recordVideoDetection(det, cameraCode, cameraName);
  };

  return {
    detections,
    isLoading,
    refreshDetections: fetchDetections,
    recordDetection
  };
}
