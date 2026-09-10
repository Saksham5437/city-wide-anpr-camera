import { trafficStore } from './trafficStore';
import { VehicleClass } from '../types';

export interface ObservedANPRData {
  plate_number: string;
  anpr_confidence: number;
  plate_detection_confidence?: number;
  vehicle_detection_confidence?: number;
  vehicle_type: string;
  vehicle_color: string;
  make_model?: string | null;
  country_code: string;
  plate_bbox: [number, number, number, number]; // [x, y, w, h] in source px
  vehicle_bbox: [number, number, number, number];
  source: 'plate_recognizer' | 'local_anpr' | 'external_anpr';
  snapshot_url?: string;
  plate_crop_url?: string;
}

export interface DatabaseVehicleMatch {
  matched: boolean;
  vehicle_id?: string | null;
  registered_owner?: string;
  registered_state?: string;
  is_watchlisted?: boolean;
  violations_count?: number;
  sightings_count?: number;
}

export interface ANPRDetectionResult {
  observed: ObservedANPRData;
  database: DatabaseVehicleMatch;
  // Backward compatibility fields
  plate: string;
  confidence: number;
  vehicle_type: string;
  vehicle_color: string;
  brand?: string;
  format?: string;
  vehicle_bbox: [number, number, number, number];
  plate_bbox: [number, number, number, number];
  snapshot_url?: string;
  plate_crop_url?: string;
  is_watchlisted?: boolean;
}

export interface ANPRUploadResponse {
  success: boolean;
  filename: string;
  image_url: string;
  resolution: string;
  processing_time_ms: number;
  detections_count: number;
  detections: ANPRDetectionResult[];
  timestamp: string;
  anpr_provider?: string;
}

const PLATE_RECOGNIZER_KEY = (import.meta as any).env?.VITE_ANPR_API_KEY || '66d5a73eba3e1d79a3aa3ab19368e9648e08ac01';
const PLATE_RECOGNIZER_URL = 'https://api.platerecognizer.com/v1/plate-reader/';

class ExternalANPRService {
  private apiUrl: string = '/api/anpr';

  /**
   * Uploads and recognizes an image using either backend API or direct Plate Recognizer cloud API
   * (Ensures 100% functionality when deployed on Vercel without local backend).
   */
  public async uploadAndRecognizeImage(
    file: File,
    cameraCode: string = 'CAM-003',
    cameraName: string = 'Hebbal Flyover Main Deck',
    location: string = 'Hebbal Flyover, Bengaluru'
  ): Promise<ANPRUploadResponse> {
    const objectUrl = URL.createObjectURL(file);

    // 1. Try backend API endpoint first
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('camera_code', cameraCode);
      formData.append('camera_name', cameraName);
      formData.append('location', location);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${this.apiUrl}/upload-image`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.detections && data.detections.length > 0) {
          return data;
        }
      }
    } catch {
      // Backend not running on this domain (e.g. Vercel static deployment)
    }

    // 2. Direct Cloud Call to Plate Recognizer API (for Vercel Live Deployment)
    try {
      const cloudFormData = new FormData();
      cloudFormData.append('upload', file);
      cloudFormData.append('regions', 'in,us,gb,eu');

      const prResponse = await fetch(PLATE_RECOGNIZER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${PLATE_RECOGNIZER_KEY}`
        },
        body: cloudFormData
      });

      if (prResponse.ok) {
        const payload = await prResponse.json();
        const results = payload.results || [];
        const imgW = payload.image_width || 1280;
        const imgH = payload.image_height || 720;

        const detections: ANPRDetectionResult[] = results.map((item: any) => {
          let rawPlate = (item.plate || '').toUpperCase().trim();
          if (item.candidates && Array.isArray(item.candidates)) {
            const indianMatch = item.candidates.find((c: any) => /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/i.test(c.plate));
            if (indianMatch && indianMatch.plate) {
              rawPlate = indianMatch.plate.toUpperCase().trim();
            }
          }

          const score = Math.round((item.score || 0.95) * 100);

          const pbox = item.box || {};
          const px1 = pbox.xmin !== undefined ? pbox.xmin : 0;
          const py1 = pbox.ymin !== undefined ? pbox.ymin : 0;
          const px2 = pbox.xmax !== undefined ? pbox.xmax : px1 + 80;
          const py2 = pbox.ymax !== undefined ? pbox.ymax : py1 + 30;
          const plateBbox: [number, number, number, number] = [px1, py1, Math.max(10, px2 - px1), Math.max(10, py2 - py1)];

          const vehInfo = item.vehicle || {};
          const vbox = vehInfo.box || {};
          const vx1 = vbox.xmin !== undefined ? vbox.xmin : Math.max(0, px1 - 60);
          const vy1 = vbox.ymin !== undefined ? vbox.ymin : Math.max(0, py1 - 100);
          const vx2 = vbox.xmax !== undefined ? vbox.xmax : px2 + 60;
          const vy2 = vbox.ymax !== undefined ? vbox.ymax : py2 + 50;
          const vehicleBbox: [number, number, number, number] = [vx1, vy1, Math.max(20, vx2 - vx1), Math.max(20, vy2 - vy1)];

          let vType: VehicleClass = 'Car';
          if (vehInfo.type) {
            const t = vehInfo.type.toLowerCase();
            if (t.includes('truck')) vType = 'Truck';
            else if (t.includes('bus')) vType = 'Bus';
            else if (t.includes('motorcycle') || t.includes('bike')) vType = 'Motorcycle';
            else if (t.includes('auto') || t.includes('rickshaw')) vType = 'Auto-rickshaw';
            else vType = 'Car';
          }

          const countryCode = (item.region?.code || 'IND').toUpperCase();
          const color = (item.color?.[0]?.color || 'White').capitalize();
          const makeModel = item.model_make?.[0] ? `${item.model_make[0].make} ${item.model_make[0].model}` : `${vType} (Detected)`;

          // Auto-register in client-side TMC database
          const existingVeh = trafficStore.getVehicleByPlate(rawPlate);
          trafficStore.addVehicleIfMissing({
            plate: rawPlate,
            type: vType,
            color: color,
            makeModel: makeModel,
            registeredState: `Region: ${countryCode}`
          });

          return {
            observed: {
              plate_number: rawPlate,
              anpr_confidence: score,
              plate_detection_confidence: score,
              vehicle_detection_confidence: Math.round((vehInfo.score || 0.95) * 100),
              vehicle_type: vType,
              vehicle_color: color,
              make_model: makeModel,
              country_code: countryCode,
              plate_bbox: plateBbox,
              vehicle_bbox: vehicleBbox,
              source: 'plate_recognizer',
              snapshot_url: objectUrl,
              plate_crop_url: ''
            },
            database: {
              matched: !!existingVeh,
              vehicle_id: existingVeh?.id || null,
              registered_owner: existingVeh?.registeredOwner || 'RTO Registered',
              registered_state: existingVeh?.registeredState || `Region ${countryCode}`,
              is_watchlisted: existingVeh?.isWatchlisted || false
            },
            plate: rawPlate,
            confidence: score,
            vehicle_type: vType,
            vehicle_color: color,
            brand: makeModel,
            format: countryCode,
            vehicle_bbox: vehicleBbox,
            plate_bbox: plateBbox,
            snapshot_url: objectUrl,
            plate_crop_url: '',
            is_watchlisted: existingVeh?.isWatchlisted || false
          };
        });

        return {
          success: true,
          filename: file.name,
          image_url: objectUrl,
          resolution: `${imgW}x${imgH}`,
          processing_time_ms: payload.processing_time || 120,
          detections_count: detections.length,
          detections: detections,
          timestamp: new Date().toISOString(),
          anpr_provider: 'Plate Recognizer Cloud Engine'
        };
      }
    } catch (cloudErr) {
      console.warn('Plate Recognizer cloud call notice:', cloudErr);
    }

    return {
      success: false,
      filename: file.name,
      image_url: objectUrl,
      resolution: '1280x720',
      processing_time_ms: 0,
      detections_count: 0,
      detections: [],
      timestamp: new Date().toISOString()
    };
  }
}

// String capitalize helper for vehicle colors
declare global {
  interface String {
    capitalize(): string;
  }
}
if (!String.prototype.capitalize) {
  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };
}

export const externalAnprService = new ExternalANPRService();
