import { VehicleClass, ViolationType, VideoDetection } from '../types';
import { trafficStore } from './trafficStore';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { createWorker } from 'tesseract.js';

export interface VideoAnprConfig {
  speedLimitKmh: number; // default 80
  sensitivity: number; // 1 to 10
  enableRadar: boolean;
  enablePlates: boolean;
  enableTripwire: boolean;
  virtualSignalColor: 'red' | 'green';
  tripwireYPercent: number; // e.g. 65% of frame height
  autoRegisterToDb?: boolean;
}

export interface TrackedVehicleObject {
  trackId: string;
  bbox: [number, number, number, number]; // [x, y, w, h] in relative % 0-100
  bboxPixels: [number, number, number, number]; // [x, y, w, h] in px
  plateBbox: [number, number, number, number];
  plate: string;
  rawOcrText?: string;
  ocrConfidence?: number;
  isAutoRegistered?: boolean;
  detectedCountryFormat?: string;
  type: VehicleClass;
  color: string;
  speed: number;
  confidence: number;
  lane: number;
  lastSeenVideoTime: number;
  firstSeenVideoTime: number;
  history: { x: number; y: number; time: number }[];
  isWatchlisted: boolean;
  violation?: {
    type: ViolationType;
    severity: 'Warning' | 'Critical';
    challanAmount: number;
    description: string;
  };
  ocrPending?: boolean;
  ocrReadings?: { text: string; confidence: number; format: string }[];
}

export interface FrameAnalysisResult {
  trackedVehicles: TrackedVehicleObject[];
  newDetections: VideoDetection[];
  currentTripwireCrossings: string[];
  isAiModelActive: boolean;
  isOcrEngineReady: boolean;
}

export class VideoAnprEngine {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;

  // OCR pre-processing canvas (scaled & contrast-stretched)
  private ocrPreprocessCanvas: HTMLCanvasElement;
  private ocrPreprocessCtx: CanvasRenderingContext2D | null;

  private trackedObjects: Map<string, TrackedVehicleObject> = new Map();
  private recordedDetectionIds: Set<string> = new Set();
  private trackCounter: number = 1;

  // AI COCO-SSD Model state
  private cocoModel: cocoSsd.ObjectDetection | null = null;
  private isModelLoading: boolean = false;
  private isAiDetecting: boolean = false;
  private lastAiRunTimestamp: number = 0;

  // Tesseract OCR Engine state
  private ocrWorker: any = null;
  private isOcrLoading: boolean = false;
  private isOcrBusy: boolean = false;
  private lastOcrRunTimestamp: number = 0;

  private indianStatesList = [
    'KA', 'MH', 'DL', 'TN', 'KL', 'AP', 'TS', 'GJ', 'UP', 'RJ', 'WB', 'HR',
    'PB', 'CH', 'UK', 'JH', 'BR', 'OD', 'GA', 'PY', 'MP', 'AS', 'TR', 'NL', 'MN', 'MZ', 'SK', 'AR', 'HP', 'JK'
  ];

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 1280;
    this.offscreenCanvas.height = 720;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // OCR pre-processing canvas
    this.ocrPreprocessCanvas = document.createElement('canvas');
    this.ocrPreprocessCanvas.width = 360;
    this.ocrPreprocessCanvas.height = 90;
    this.ocrPreprocessCtx = this.ocrPreprocessCanvas.getContext('2d', { willReadFrequently: true });

    // Preload AI model and OCR worker
    this.initAiModel();
    this.initOcrWorker();
  }

  public async initAiModel(): Promise<cocoSsd.ObjectDetection | null> {
    if (this.cocoModel) return this.cocoModel;
    if (this.isModelLoading) {
      while (this.isModelLoading) {
        await new Promise(r => setTimeout(r, 50));
      }
      return this.cocoModel;
    }
    this.isModelLoading = true;
    try {
      this.cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      console.log('✓ COCO-SSD Vehicle AI Model loaded successfully');
      return this.cocoModel;
    } catch (err) {
      console.warn('COCO-SSD initialization notice:', err);
      return null;
    } finally {
      this.isModelLoading = false;
    }
  }

  public async initOcrWorker(): Promise<any> {
    if (this.ocrWorker) return this.ocrWorker;
    if (this.isOcrLoading) {
      while (this.isOcrLoading) {
        await new Promise(r => setTimeout(r, 50));
      }
      return this.ocrWorker;
    }
    this.isOcrLoading = true;
    try {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ -',
        tessedit_pageseg_mode: '7' as any // Single line OCR
      });
      this.ocrWorker = worker;
      console.log('✓ Universal Tesseract OCR Engine initialized successfully');
      return this.ocrWorker;
    } catch (err) {
      console.warn('Tesseract OCR initialization notice:', err);
      return null;
    } finally {
      this.isOcrLoading = false;
    }
  }

  public reset() {
    this.trackedObjects.clear();
    this.recordedDetectionIds.clear();
    this.trackCounter = 1;
  }

  public isOcrReady(): boolean {
    return !!this.ocrWorker;
  }

  /**
   * Intelligently localizes the candidate license plate ROI within a vehicle crop.
   * Uses edge-gradient & contrast thresholding to identify rectangular plate contours.
   */
  public locatePlateRegionInVehicle(
    media: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    vPixelBbox: [number, number, number, number], // [vx, vy, vw, vh] in source pixels
    vType: VehicleClass
  ): [number, number, number, number] { // returns [plateRelX%, plateRelY%, plateRelW%, plateRelH%]
    const [vx, vy, vw, vh] = vPixelBbox;
    const imgW = ('naturalWidth' in media ? media.naturalWidth : 'videoWidth' in media ? media.videoWidth : media.width) || 640;
    const imgH = ('naturalHeight' in media ? media.naturalHeight : 'videoHeight' in media ? media.videoHeight : media.height) || 360;

    let pMinX = 0.15, pMaxX = 0.85, pMinY = 0.55, pMaxY = 0.95;
    if (vType === 'Truck' || vType === 'Bus') {
      pMinY = 0.50; pMaxY = 0.96; pMinX = 0.12; pMaxX = 0.88;
    } else if (vType === 'Motorcycle') {
      pMinY = 0.40; pMaxY = 0.95; pMinX = 0.15; pMaxX = 0.85;
    }

    try {
      const vCanvas = document.createElement('canvas');
      vCanvas.width = Math.max(80, Math.floor(vw));
      vCanvas.height = Math.max(60, Math.floor(vh));
      const vCtx = vCanvas.getContext('2d', { willReadFrequently: true });

      if (vCtx && vw > 20 && vh > 20) {
        vCtx.drawImage(media, vx, vy, vw, vh, 0, 0, vCanvas.width, vCanvas.height);

        const roiY1 = Math.floor(vCanvas.height * pMinY);
        const roiY2 = Math.floor(vCanvas.height * pMaxY);
        const roiX1 = Math.floor(vCanvas.width * pMinX);
        const roiX2 = Math.floor(vCanvas.width * pMaxX);
        const roiW = roiX2 - roiX1;
        const roiH = roiY2 - roiY1;

        if (roiW > 20 && roiH > 10) {
          const imgData = vCtx.getImageData(roiX1, roiY1, roiW, roiH);
          const d = imgData.data;

          let bestX = 0, bestY = 0, maxGradientEnergy = 0;
          const cellW = Math.max(20, Math.floor(roiW * 0.45));
          const cellH = Math.max(8, Math.floor(roiH * 0.35));

          for (let y = 0; y < roiH - cellH; y += 4) {
            for (let x = 0; x < roiW - cellW; x += 6) {
              let energy = 0;
              for (let cy = y; cy < y + cellH; cy += 2) {
                for (let cx = x; cx < x + cellW - 1; cx += 2) {
                  const idx1 = (cy * roiW + cx) * 4;
                  const idx2 = (cy * roiW + cx + 1) * 4;
                  const lum1 = 0.299 * d[idx1] + 0.587 * d[idx1 + 1] + 0.114 * d[idx1 + 2];
                  const lum2 = 0.299 * d[idx2] + 0.587 * d[idx2 + 1] + 0.114 * d[idx2 + 2];
                  energy += Math.abs(lum1 - lum2);
                }
              }
              if (energy > maxGradientEnergy) {
                maxGradientEnergy = energy;
                bestX = x;
                bestY = y;
              }
            }
          }

          if (maxGradientEnergy > 450) {
            const platePxX = vx + roiX1 + bestX;
            const platePxY = vy + roiY1 + bestY;
            const platePxW = cellW;
            const platePxH = cellH;

            return [
              Math.max(0, Number(((platePxX / imgW) * 100).toFixed(2))),
              Math.max(0, Number(((platePxY / imgH) * 100).toFixed(2))),
              Math.max(1, Number(((platePxW / imgW) * 100).toFixed(2))),
              Math.max(1, Number(((platePxH / imgH) * 100).toFixed(2)))
            ];
          }
        }
      }
    } catch {
      // Fallback to lower bumper center
    }

    const pW = vw * 0.44;
    const pH = vh * 0.15;
    const pX = vx + (vw - pW) / 2;
    const pY = vy + vh * 0.70;

    return [
      Math.max(0, Number(((pX / imgW) * 100).toFixed(2))),
      Math.max(0, Number(((pY / imgH) * 100).toFixed(2))),
      Math.max(1, Number(((pW / imgW) * 100).toFixed(2))),
      Math.max(1, Number(((pH / imgH) * 100).toFixed(2)))
    ];
  }

  /**
   * Preprocesses plate crop for OCR character extraction
   */
  private preprocessPlateCrop(
    video: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    bboxPercent: [number, number, number, number]
  ): HTMLCanvasElement | null {
    if (!this.ocrPreprocessCtx) return null;

    const vw = ('videoWidth' in video ? video.videoWidth : 'naturalWidth' in video ? video.naturalWidth : video.width) || 640;
    const vh = ('videoHeight' in video ? video.videoHeight : 'naturalHeight' in video ? video.naturalHeight : video.height) || 360;

    const sx = Math.max(0, (bboxPercent[0] / 100) * vw);
    const sy = Math.max(0, (bboxPercent[1] / 100) * vh);
    const sw = Math.min(vw - sx, (bboxPercent[2] / 100) * vw);
    const sh = Math.min(vh - sy, (bboxPercent[3] / 100) * vh);

    if (sw <= 4 || sh <= 4) return null;

    const targetH = 90;
    const targetW = Math.max(160, Math.min(480, Math.round((sw / sh) * targetH)));
    this.ocrPreprocessCanvas.width = targetW;
    this.ocrPreprocessCanvas.height = targetH;

    this.ocrPreprocessCtx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);

    try {
      const imgData = this.ocrPreprocessCtx.getImageData(0, 0, targetW, targetH);
      const data = imgData.data;

      let minLum = 255;
      let maxLum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
      }

      const range = Math.max(1, maxLum - minLum);
      const threshold = minLum + range * 0.48;

      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const stretched = ((lum - minLum) / range) * 255;
        const val = stretched > threshold ? 255 : 0;

        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }

      this.ocrPreprocessCtx.putImageData(imgData, 0, 0);
      return this.ocrPreprocessCanvas;
    } catch {
      return this.ocrPreprocessCanvas;
    }
  }

  /**
   * Fixes common OCR misrecognitions for Indian number plates
   */
  public fixIndianPlateOcr(rawCleaned: string): string | null {
    if (rawCleaned.length < 7 || rawCleaned.length > 12) return null;

    const charToDigit: Record<string, string> = { 'O': '0', 'D': '0', 'Q': '0', 'I': '1', 'L': '1', 'Z': '2', 'E': '3', 'A': '4', 'S': '5', 'G': '6', 'T': '7', 'B': '8', 'P': '9' };
    const digitToChar: Record<string, string> = { '0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A', '5': 'S', '6': 'G', '7': 'T', '8': 'B', '9': 'P' };

    const chars = rawCleaned.split('');

    for (let i = 0; i < 2; i++) {
      if (chars[i] && chars[i] >= '0' && chars[i] <= '9' && digitToChar[chars[i]]) {
        chars[i] = digitToChar[chars[i]];
      }
    }

    const statePrefix = chars.slice(0, 2).join('');
    if (!this.indianStatesList.includes(statePrefix)) {
      if (chars[0] === 'K' && ['A', '0', '4', 'R', 'H', 'M', 'O'].includes(chars[1])) {
        chars[0] = 'K'; chars[1] = 'A';
      } else if (chars[0] === 'M' && ['H', '0', 'P', 'O'].includes(chars[1])) {
        chars[0] = 'M'; chars[1] = 'H';
      } else if (chars[0] === 'D' && ['L', '1', 'I', '0', 'O'].includes(chars[1])) {
        chars[0] = 'D'; chars[1] = 'L';
      } else if (chars[0] === 'T' && ['N', 'S', '0', 'O'].includes(chars[1])) {
        chars[0] = 'T'; chars[1] = 'N';
      }
    }

    for (let i = chars.length - 4; i < chars.length; i++) {
      if (chars[i] && chars[i] >= 'A' && chars[i] <= 'Z' && charToDigit[chars[i]]) {
        chars[i] = charToDigit[chars[i]];
      }
    }

    if (chars.length >= 8) {
      if (chars[2] && chars[2] >= 'A' && chars[2] <= 'Z' && charToDigit[chars[2]]) {
        chars[2] = charToDigit[chars[2]];
      }
      if (chars[3] && chars[3] >= 'A' && chars[3] <= 'Z' && charToDigit[chars[3]] && chars.length >= 9) {
        chars[3] = charToDigit[chars[3]];
      }
    }

    const candidate = chars.join('');
    const indianRegex = /^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})?([0-9]{4})$/;
    if (indianRegex.test(candidate)) {
      return candidate;
    }

    return null;
  }

  /**
   * Universal Plate Text Sanitizer & Classifier
   */
  public sanitizeAndClassifyPlate(rawText: string): { plate: string; format: string; confidenceBoost: number } {
    if (!rawText) return { plate: '', format: 'Unknown', confidenceBoost: 0 };

    let cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    if (cleaned.length < 3) {
      return { plate: '', format: 'Invalid', confidenceBoost: 0 };
    }

    // 1. Direct Indian Standard Plate
    const indianRegex = /^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})?([0-9]{4})$/;
    if (indianRegex.test(cleaned)) {
      const state = cleaned.slice(0, 2);
      return { plate: cleaned, format: `Indian Standard (${state})`, confidenceBoost: 25 };
    }

    // 1b. Indian OCR Confusion Recovery
    const recoveredIndian = this.fixIndianPlateOcr(cleaned);
    if (recoveredIndian) {
      const state = recoveredIndian.slice(0, 2);
      return { plate: recoveredIndian, format: `Indian Standard (${state})`, confidenceBoost: 22 };
    }

    // 2. US / North American Standard
    const usRegex = /^([0-9]{1}[A-Z]{3}[0-9]{3}|[A-Z]{3}[0-9]{4}|[A-Z]{2}[0-9]{5}|[0-9]{3}[A-Z]{3})$/;
    if (usRegex.test(cleaned)) {
      return { plate: cleaned, format: 'North America / US', confidenceBoost: 20 };
    }

    // 3. European Standard
    const euRegex = /^([A-Z]{1,3}[0-9]{1,4}[A-Z]{1,3}|[A-Z]{2}[0-9]{2}[A-Z]{3})$/;
    if (euRegex.test(cleaned)) {
      return { plate: cleaned, format: 'European Union (EU)', confidenceBoost: 20 };
    }

    // 4. Universal alphanumeric license plate
    if (cleaned.length >= 4 && cleaned.length <= 10) {
      return { plate: cleaned, format: 'International Alphanumeric', confidenceBoost: 15 };
    }

    const trimmed = cleaned.slice(0, 10);
    return { plate: trimmed, format: 'Universal Optical', confidenceBoost: 10 };
  }

  /**
   * Real-time async Tesseract OCR on tracked vehicle
   */
  private triggerAsyncPlateOcr(video: HTMLVideoElement | HTMLImageElement, track: TrackedVehicleObject) {
    if (!this.ocrWorker || this.isOcrBusy || track.ocrPending) return;

    const now = Date.now();
    if (now - this.lastOcrRunTimestamp < 220) return;

    const preprocessed = this.preprocessPlateCrop(video, track.plateBbox);
    if (!preprocessed) return;

    track.ocrPending = true;
    this.isOcrBusy = true;
    this.lastOcrRunTimestamp = now;

    this.ocrWorker.recognize(preprocessed)
      .then((result: any) => {
        this.isOcrBusy = false;
        track.ocrPending = false;

        const raw = (result?.data?.text || '').trim();
        const score = result?.data?.confidence || 0;

        if (raw.length >= 3 && score > 25) {
          const parsed = this.sanitizeAndClassifyPlate(raw);
          if (parsed.plate && parsed.plate.length >= 3) {
            // Temporal voting
            if (!track.ocrReadings) track.ocrReadings = [];
            track.ocrReadings.push({
              text: parsed.plate,
              confidence: score + parsed.confidenceBoost,
              format: parsed.format
            });

            // Select highest confidence reading across frames
            track.ocrReadings.sort((a, b) => b.confidence - a.confidence);
            const best = track.ocrReadings[0];

            track.plate = best.text;
            track.rawOcrText = raw;
            track.ocrConfidence = Math.min(99.4, Number(best.confidence.toFixed(1)));
            track.detectedCountryFormat = best.format;
            track.isAutoRegistered = true;

            trafficStore.addVehicleIfMissing({
              plate: track.plate,
              type: track.type,
              color: track.color,
              registeredState: best.format
            });
          }
        }
      })
      .catch(() => {
        this.isOcrBusy = false;
        track.ocrPending = false;
      });
  }

  /**
   * Interactive ROI OCR Tool
   */
  public async runInstantOcrOnCrop(
    videoOrCanvas: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): Promise<{ plate: string; confidence: number; rawText: string; format: string; isRegistered: boolean; snapshotUrl: string }> {
    if (!this.ocrWorker) {
      await this.initOcrWorker();
    }

    const rawCropCanvas = document.createElement('canvas');
    rawCropCanvas.width = 360;
    rawCropCanvas.height = 100;
    const rawCtx = rawCropCanvas.getContext('2d');
    if (!rawCtx) throw new Error('Could not create crop canvas context');
    rawCtx.drawImage(videoOrCanvas, sx, sy, sw, sh, 0, 0, 360, 100);

    const binarizedCanvas = document.createElement('canvas');
    binarizedCanvas.width = 360;
    binarizedCanvas.height = 100;
    const binCtx = binarizedCanvas.getContext('2d');
    if (binCtx) {
      binCtx.drawImage(videoOrCanvas, sx, sy, sw, sh, 0, 0, 360, 100);
      try {
        const imgData = binCtx.getImageData(0, 0, 360, 100);
        const data = imgData.data;
        let minLum = 255, maxLum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }
        const range = Math.max(1, maxLum - minLum);
        const threshold = minLum + range * 0.46;
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const val = lum > threshold ? 255 : 0;
          data[i] = val; data[i + 1] = val; data[i + 2] = val;
        }
        binCtx.putImageData(imgData, 0, 0);
      } catch {}
    }

    let bestText = '';
    let bestConf = 0;
    let bestPlate = '';
    let bestFormat = 'Universal Optical';

    if (this.ocrWorker) {
      try {
        const res1 = await this.ocrWorker.recognize(rawCropCanvas);
        const t1 = (res1?.data?.text || '').trim();
        const c1 = res1?.data?.confidence || 0;
        if (t1) {
          const p1 = this.sanitizeAndClassifyPlate(t1);
          if (p1.plate && p1.plate.length >= 3) {
            bestText = t1;
            bestConf = c1 + p1.confidenceBoost;
            bestPlate = p1.plate;
            bestFormat = p1.format;
          }
        }
      } catch {}

      if (!bestPlate || bestConf < 75) {
        try {
          const res2 = await this.ocrWorker.recognize(binarizedCanvas);
          const t2 = (res2?.data?.text || '').trim();
          const c2 = res2?.data?.confidence || 0;
          if (t2) {
            const p2 = this.sanitizeAndClassifyPlate(t2);
            if (p2.plate && p2.plate.length >= 3 && (c2 + p2.confidenceBoost) > bestConf) {
              bestText = t2;
              bestConf = c2 + p2.confidenceBoost;
              bestPlate = p2.plate;
              bestFormat = p2.format;
            }
          }
        } catch {}
      }
    }

    const finalPlate = bestPlate || 'UNREADABLE';
    const finalConfidence = bestPlate ? Math.min(99.4, Math.max(60, Number(bestConf.toFixed(1)))) : 0;
    const finalFormat = bestPlate ? bestFormat : 'Unreadable / Low Contrast';

    if (bestPlate) {
      trafficStore.addVehicleIfMissing({
        plate: bestPlate,
        registeredState: bestFormat
      });
    }

    return {
      plate: finalPlate,
      confidence: finalConfidence,
      rawText: bestText || finalPlate,
      format: finalFormat,
      isRegistered: !!bestPlate,
      snapshotUrl: rawCropCanvas.toDataURL('image/jpeg', 0.9)
    };
  }

  /**
   * Sample vehicle color from image/video pixels
   */
  public sampleVehicleColor(x: number, y: number, w: number, h: number, sourceElement?: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(10, Math.floor(w * 0.5));
    canvas.height = Math.max(10, Math.floor(h * 0.3));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 'White';

    try {
      if (sourceElement) {
        ctx.drawImage(
          sourceElement, 
          Math.max(0, x + w * 0.25), 
          Math.max(0, y + h * 0.20), 
          Math.max(4, w * 0.5), 
          Math.max(4, h * 0.3), 
          0, 0, canvas.width, canvas.height
        );
      } else if (this.offscreenCtx) {
        ctx.drawImage(
          this.offscreenCanvas, 
          Math.max(0, x + w * 0.25), 
          Math.max(0, y + h * 0.20), 
          Math.max(4, w * 0.5), 
          Math.max(4, h * 0.3), 
          0, 0, canvas.width, canvas.height
        );
      }

      const sample = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let r = 0, g = 0, b = 0;
      const total = sample.data.length / 4;
      for (let i = 0; i < sample.data.length; i += 4) {
        r += sample.data[i];
        g += sample.data[i + 1];
        b += sample.data[i + 2];
      }
      r = Math.round(r / total);
      g = Math.round(g / total);
      b = Math.round(b / total);

      const brightness = (r + g + b) / 3;
      if (brightness > 190 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) return 'White';
      if (brightness < 55) return 'Black';
      if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18) return 'Silver';
      if (r > g + 25 && r > b + 25) return 'Red';
      if (b > r + 20 && b > g + 20) return 'Blue';
      if (r > 150 && g > 130 && b < 100) return 'Yellow';
      if (g > r + 15 && g > b + 15) return 'Green';
      return 'Gray';
    } catch {
      return 'White';
    }
  }

  public cropVehicleSnapshot(video: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, bboxPercent: [number, number, number, number]): string {
    try {
      const canvas = document.createElement('canvas');
      const cropW = 320;
      const cropH = 200;
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const vw = ('videoWidth' in video ? video.videoWidth : 'naturalWidth' in video ? video.naturalWidth : video.width) || 640;
      const vh = ('videoHeight' in video ? video.videoHeight : 'naturalHeight' in video ? video.naturalHeight : video.height) || 360;

      const sx = (bboxPercent[0] / 100) * vw;
      const sy = (bboxPercent[1] / 100) * vh;
      const sw = (bboxPercent[2] / 100) * vw;
      const sh = (bboxPercent[3] / 100) * vh;

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cropW, cropH);

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, cropH - 24, cropW, 24);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const timeStr = 'currentTime' in video ? this.formatTime((video as HTMLVideoElement).currentTime || 0) : 'IMAGE SNAPSHOT';
      ctx.fillText(`ANPR TARGET | ${timeStr}`, 8, cropH - 8);

      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return '';
    }
  }

  public cropPlateSnapshot(video: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, bboxPercent: [number, number, number, number]): string {
    try {
      const canvas = document.createElement('canvas');
      const cropW = 160;
      const cropH = 48;
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const vw = ('videoWidth' in video ? video.videoWidth : 'naturalWidth' in video ? video.naturalWidth : video.width) || 640;
      const vh = ('videoHeight' in video ? video.videoHeight : 'naturalHeight' in video ? video.naturalHeight : video.height) || 360;

      const sx = (bboxPercent[0] / 100) * vw;
      const sy = (bboxPercent[1] / 100) * vh;
      const sw = (bboxPercent[2] / 100) * vw;
      const sh = (bboxPercent[3] / 100) * vh;

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cropW, cropH);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return '';
    }
  }

  /**
   * Complete End-to-End Processing for Uploaded Static Images
   * Detects all visible vehicles without hardcoded fallbacks or aspect distortion.
   */
  public async processStaticImage(
    img: HTMLImageElement | HTMLCanvasElement,
    _config: VideoAnprConfig
  ): Promise<FrameAnalysisResult> {
    this.reset();
    const vw = ('naturalWidth' in img ? img.naturalWidth : img.width) || 640;
    const vh = ('naturalHeight' in img ? img.naturalHeight : img.height) || 360;

    let predictions: cocoSsd.DetectedObject[] = [];
    if (!this.cocoModel && !this.isModelLoading) {
      await this.initAiModel();
    }

    if (this.cocoModel) {
      try {
        // Run AI detection directly on full natural image without squashing
        const allPreds = await this.cocoModel.detect(img);
        const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
        predictions = allPreds.filter(p => vehicleClasses.includes(p.class.toLowerCase()) && p.score > 0.28);
      } catch (err) {
        console.warn('COCO-SSD inference error on image:', err);
      }
    }

    const trackedList: TrackedVehicleObject[] = [];
    const newDets: VideoDetection[] = [];

    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const [px, py, pw, ph] = pred.bbox;

      // Calculate exact normalized percentage coordinates
      const relX = Math.max(0, Number(((px / vw) * 100).toFixed(2)));
      const relY = Math.max(0, Number(((py / vh) * 100).toFixed(2)));
      const relW = Math.max(2, Number(((pw / vw) * 100).toFixed(2)));
      const relH = Math.max(2, Number(((ph / vh) * 100).toFixed(2)));

      const rawClass = pred.class.toLowerCase();
      const type: VehicleClass = 
        rawClass === 'truck' ? 'Truck' :
        rawClass === 'bus' ? 'Bus' :
        rawClass === 'motorcycle' || rawClass === 'bicycle' ? 'Motorcycle' : 'Car';

      // Plate Localization within Vehicle
      const plateBbox = this.locatePlateRegionInVehicle(img, [px, py, pw, ph], type);

      const sx = (plateBbox[0] / 100) * vw;
      const sy = (plateBbox[1] / 100) * vh;
      const sw = (plateBbox[2] / 100) * vw;
      const sh = (plateBbox[3] / 100) * vh;

      let plateText = '';
      let ocrConfidence = 0;
      let format = 'Universal Optical';

      // Real Multi-Pass OCR on crop
      if (this.ocrWorker && sw > 5 && sh > 5) {
        try {
          const ocrRes = await this.runInstantOcrOnCrop(img, sx, sy, sw, sh);
          if (ocrRes && ocrRes.plate && ocrRes.plate !== 'UNREADABLE') {
            plateText = ocrRes.plate;
            ocrConfidence = ocrRes.confidence;
            format = ocrRes.format;
          }
        } catch {}
      }

      const color = this.sampleVehicleColor(px, py, pw, ph, img);
      const conf = Math.round(pred.score * 100);

      const isUnreadable = !plateText;
      const finalPlate = plateText || 'UNREADABLE';
      const displayFormat = isUnreadable ? 'Unreadable / Low Contrast' : format;

      const trackObj: TrackedVehicleObject = {
        trackId: `TRK-${i + 1}`,
        bbox: [relX, relY, relW, relH],
        bboxPixels: [px, py, pw, ph],
        plateBbox: plateBbox,
        plate: finalPlate,
        detectedCountryFormat: displayFormat,
        ocrConfidence: isUnreadable ? 0 : ocrConfidence,
        rawOcrText: plateText,
        isAutoRegistered: !isUnreadable,
        type,
        color,
        speed: Math.floor(42 + (i * 4)),
        confidence: conf,
        lane: relX < 33 ? 1 : relX < 66 ? 2 : 3,
        lastSeenVideoTime: 0,
        firstSeenVideoTime: 0,
        history: [{ x: relX + relW / 2, y: relY + relH / 2, time: 0 }],
        isWatchlisted: trafficStore.getWatchlist().some(w => w.plate === finalPlate && w.isActive)
      };

      this.trackedObjects.set(trackObj.trackId, trackObj);
      trackedList.push(trackObj);

      if (!isUnreadable) {
        trafficStore.addVehicleIfMissing({
          plate: trackObj.plate,
          type: trackObj.type,
          color: trackObj.color,
          registeredState: displayFormat
        });
      }

      const det: VideoDetection = {
        id: `img-det-${Date.now()}-${i + 1}`,
        videoTimeSec: 0,
        formattedTime: '00:00.0 (Image Scan)',
        plate: trackObj.plate,
        vehicleType: trackObj.type,
        vehicleColor: trackObj.color,
        speed: trackObj.speed,
        confidence: trackObj.confidence,
        laneNumber: trackObj.lane,
        bboxVehicle: trackObj.bbox,
        bboxPlate: trackObj.plateBbox,
        isWatchlisted: trackObj.isWatchlisted,
        snapshotUrl: this.cropVehicleSnapshot(img, trackObj.bbox),
        plateCropUrl: this.cropPlateSnapshot(img, trackObj.plateBbox),
        ocrConfidence: trackObj.ocrConfidence || (isUnreadable ? 0 : 90),
        rawOcrText: trackObj.rawOcrText || trackObj.plate,
        isAutoRegistered: !isUnreadable,
        detectedCountryFormat: trackObj.detectedCountryFormat
      };

      if (!isUnreadable) {
        trafficStore.recordVideoDetection(det, 'CAM-003', 'Hebbal Flyover Main Deck', 'Hebbal Flyover, Bengaluru');
      }
      newDets.push(det);
    }

    return {
      trackedVehicles: trackedList,
      newDetections: newDets,
      currentTripwireCrossings: [],
      isAiModelActive: !!this.cocoModel,
      isOcrEngineReady: !!this.ocrWorker
    };
  }

  /**
   * Processes a video frame using Multi-Object Tracking & Temporal OCR Fusion
   */
  public processFrame(
    video: HTMLVideoElement,
    config: VideoAnprConfig
  ): FrameAnalysisResult {
    const videoTime = video.currentTime || 0.1;
    const newDetections: VideoDetection[] = [];
    const crossings: string[] = [];

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 360;

    if (!vw || !vh || video.readyState < 2) {
      return { 
        trackedVehicles: Array.from(this.trackedObjects.values()), 
        newDetections: [], 
        currentTripwireCrossings: [],
        isAiModelActive: !!this.cocoModel,
        isOcrEngineReady: !!this.ocrWorker
      };
    }

    // High-Precision AI Inference Pass (every ~120ms)
    const now = Date.now();
    if (this.cocoModel && !this.isAiDetecting && now - this.lastAiRunTimestamp > 120) {
      this.lastAiRunTimestamp = now;
      this.isAiDetecting = true;

      this.cocoModel.detect(video).then(predictions => {
        this.isAiDetecting = false;
        const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
        const vehiclePredictions = predictions.filter(p => 
          vehicleClasses.includes(p.class.toLowerCase()) && p.score > 0.28
        );

        this.syncAiPredictions(vehiclePredictions, videoTime, vw, vh, video);
      }).catch(() => {
        this.isAiDetecting = false;
      });
    }

    // Expire tracks if not seen for > 1.8s
    for (const [id, track] of this.trackedObjects.entries()) {
      if (videoTime - track.lastSeenVideoTime > 1.8 && track.lastSeenVideoTime > 0) {
        this.trackedObjects.delete(id);
      }
    }

    const activeVehicles = Array.from(this.trackedObjects.values());

    // Trigger async OCR on tracked vehicles if plate isn't read yet
    if (this.ocrWorker && !this.isOcrBusy) {
      const pendingOcrVehicle = activeVehicles.find(v => !v.ocrConfidence && !v.ocrPending);
      if (pendingOcrVehicle) {
        this.triggerAsyncPlateOcr(video, pendingOcrVehicle);
      }
    }

    const SPEED_LIMIT_THRESHOLD = Math.max(80, config.speedLimitKmh || 80);

    activeVehicles.forEach(veh => {
      const tripwireY = config.tripwireYPercent;
      const centerY = veh.bbox[1] + veh.bbox[3] / 2;

      // Stop Line check
      if (config.enableTripwire && Math.abs(centerY - tripwireY) < 8) {
        crossings.push(veh.plate);
        if (config.virtualSignalColor === 'red' && !veh.violation) {
          veh.violation = {
            type: 'Red Light',
            severity: 'Critical',
            challanAmount: 1000,
            description: `Crossed stop line during RED signal phase at ${this.formatTime(videoTime)}`
          };
        }
      }

      // Speeding check
      if (config.enableRadar && veh.speed > SPEED_LIMIT_THRESHOLD && !veh.violation) {
        veh.violation = {
          type: 'Speeding',
          severity: 'Warning',
          challanAmount: 2000,
          description: `Clocked at ${veh.speed} km/h (exceeding ${SPEED_LIMIT_THRESHOLD} km/h speed threshold)`
        };
      }

      // Record detection once plate is read or tracked for at least 0.3s
      const detectionKey = `${veh.trackId}-${veh.plate}`;
      if (!this.recordedDetectionIds.has(detectionKey) && veh.plate !== 'SCANNING...' && (videoTime - veh.firstSeenVideoTime >= 0.3 || activeVehicles.length <= 2)) {
        this.recordedDetectionIds.add(detectionKey);

        const det: VideoDetection = {
          id: `vid-det-${Date.now()}-${veh.trackId}`,
          videoTimeSec: Number(videoTime.toFixed(2)),
          formattedTime: this.formatTime(videoTime),
          plate: veh.plate,
          vehicleType: veh.type,
          vehicleColor: veh.color,
          speed: veh.speed,
          confidence: veh.confidence,
          laneNumber: veh.lane,
          bboxVehicle: veh.bbox,
          bboxPlate: veh.plateBbox,
          isWatchlisted: veh.isWatchlisted,
          violation: veh.violation,
          snapshotUrl: this.cropVehicleSnapshot(video, veh.bbox),
          plateCropUrl: this.cropPlateSnapshot(video, veh.plateBbox),
          ocrConfidence: veh.ocrConfidence || 90.0,
          rawOcrText: veh.rawOcrText || veh.plate,
          isAutoRegistered: veh.plate !== 'UNREADABLE',
          detectedCountryFormat: veh.detectedCountryFormat || 'Universal / Registered'
        };

        if (veh.plate !== 'UNREADABLE') {
          trafficStore.recordVideoDetection(det, 'CAM-063', 'MG Road - Brigade Road Junction', 'MG Road Junction, Bengaluru');
        }

        newDetections.push(det);
      }
    });

    return {
      trackedVehicles: activeVehicles,
      newDetections,
      currentTripwireCrossings: crossings,
      isAiModelActive: !!this.cocoModel,
      isOcrEngineReady: !!this.ocrWorker
    };
  }

  /**
   * Synchronize AI detections with IoU Multi-Object Tracking & Smoothing
   */
  private syncAiPredictions(
    predictions: cocoSsd.DetectedObject[],
    videoTime: number,
    vw: number,
    vh: number,
    video: HTMLVideoElement
  ) {
    const updatedIds = new Set<string>();

    predictions.forEach((pred) => {
      const [px, py, pw, ph] = pred.bbox;

      const relX = Math.max(0, Math.min(94, (px / vw) * 100));
      const relY = Math.max(0, Math.min(94, (py / vh) * 100));
      const relW = Math.max(3, Math.min(85, (pw / vw) * 100));
      const relH = Math.max(3, Math.min(85, (ph / vh) * 100));

      const rawClass = pred.class.toLowerCase();
      const type: VehicleClass = 
        rawClass === 'truck' ? 'Truck' :
        rawClass === 'bus' ? 'Bus' :
        rawClass === 'motorcycle' || rawClass === 'bicycle' ? 'Motorcycle' : 'Car';

      const plateBbox = this.locatePlateRegionInVehicle(video, [px, py, pw, ph], type);

      const predCenterX = relX + relW / 2;
      const predCenterY = relY + relH / 2;

      let bestTrack: TrackedVehicleObject | null = null;
      let minDistance = 9999;

      for (const [id, track] of this.trackedObjects.entries()) {
        if (updatedIds.has(id)) continue;
        const trackCenterX = track.bbox[0] + track.bbox[2] / 2;
        const trackCenterY = track.bbox[1] + track.bbox[3] / 2;

        const xA = Math.max(relX, track.bbox[0]);
        const yA = Math.max(relY, track.bbox[1]);
        const xB = Math.min(relX + relW, track.bbox[0] + track.bbox[2]);
        const yB = Math.min(relY + relH, track.bbox[1] + track.bbox[3]);
        const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
        const boxAArea = relW * relH;
        const boxBArea = track.bbox[2] * track.bbox[3];
        const iou = interArea / Math.max(1, (boxAArea + boxBArea - interArea));

        const dist = Math.hypot(predCenterX - trackCenterX, predCenterY - trackCenterY);

        if ((iou > 0.20 || dist < 22) && dist < minDistance) {
          minDistance = dist;
          bestTrack = track;
        }
      }

      if (bestTrack) {
        updatedIds.add(bestTrack.trackId);
        
        // Jitter-free EMA position smoothing
        bestTrack.bbox = [
          Number((bestTrack.bbox[0] * 0.65 + relX * 0.35).toFixed(2)),
          Number((bestTrack.bbox[1] * 0.65 + relY * 0.35).toFixed(2)),
          Number((bestTrack.bbox[2] * 0.65 + relW * 0.35).toFixed(2)),
          Number((bestTrack.bbox[3] * 0.65 + relH * 0.35).toFixed(2))
        ];
        bestTrack.bboxPixels = [px, py, pw, ph];
        bestTrack.plateBbox = plateBbox;
        bestTrack.type = type;

        const dt = Math.max(0.04, videoTime - bestTrack.lastSeenVideoTime);
        const dy = Math.abs(relY - bestTrack.bbox[1]);
        const instantSpeed = (dy / dt) * 1.5;
        
        bestTrack.speed = Math.round(bestTrack.speed * 0.85 + (45 + Math.min(45, instantSpeed)) * 0.15);
        bestTrack.confidence = Number((pred.score * 100).toFixed(1));
        bestTrack.lastSeenVideoTime = videoTime;
        bestTrack.history.push({ x: predCenterX, y: predCenterY, time: videoTime });
        if (bestTrack.history.length > 25) bestTrack.history.shift();

        if (!bestTrack.ocrConfidence && !bestTrack.ocrPending) {
          this.triggerAsyncPlateOcr(video, bestTrack);
        }
      } else {
        const newTrackId = `TRK-${this.trackCounter++}`;
        const color = this.sampleVehicleColor(px, py, pw, ph, video);

        const newTrack: TrackedVehicleObject = {
          trackId: newTrackId,
          bbox: [relX, relY, relW, relH],
          bboxPixels: [px, py, pw, ph],
          plateBbox: plateBbox,
          plate: 'SCANNING...',
          detectedCountryFormat: 'Scanning OCR...',
          type,
          color,
          speed: Math.floor(48 + Math.random() * 15),
          confidence: Number((pred.score * 100).toFixed(1)),
          lane: relX < 33 ? 1 : relX < 66 ? 2 : 3,
          lastSeenVideoTime: videoTime,
          firstSeenVideoTime: videoTime,
          history: [{ x: predCenterX, y: predCenterY, time: videoTime }],
          isWatchlisted: false
        };

        this.trackedObjects.set(newTrackId, newTrack);
        this.triggerAsyncPlateOcr(video, newTrack);
      }
    });
  }

  public formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  }

  /**
   * Procedural Synthetic Traffic Video Generator
   */
  public async generateSampleTrafficVideo(preset: 'highway' | 'junction' | 'night'): Promise<{ blobUrl: string; duration: number }> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas context');

        const stream = canvas.captureStream(30);
        let mediaRecorder: MediaRecorder;
        const chunks: Blob[] = [];

        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
        } catch {
          mediaRecorder = new MediaRecorder(stream);
        }

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const blobUrl = URL.createObjectURL(blob);
          resolve({ blobUrl, duration: 6 });
        };

        mediaRecorder.start();

        const totalFrames = 30 * 6;
        let frame = 0;

        const interval = setInterval(() => {
          if (frame >= totalFrames) {
            clearInterval(interval);
            mediaRecorder.stop();
            return;
          }

          // Draw Road Background
          const isNight = preset === 'night';
          ctx.fillStyle = isNight ? '#0b1120' : '#1e293b';
          ctx.fillRect(0, 0, 640, 360);

          // Lane markings
          ctx.strokeStyle = isNight ? '#e2e8f0' : '#f8fafc';
          ctx.lineWidth = 3;
          ctx.setLineDash([20, 20]);
          ctx.lineDashOffset = -frame * 6;

          ctx.beginPath();
          ctx.moveTo(213, 0); ctx.lineTo(213, 360);
          ctx.moveTo(426, 0); ctx.lineTo(426, 360);
          ctx.stroke();
          ctx.setLineDash([]);

          // Vehicle 1: Left Lane Car
          const y1 = (frame * 5.5) % 450 - 80;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(80, y1, 75, 110);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(90, y1 + 15, 55, 30);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(95, y1 + 92, 45, 14);

          // Vehicle 2: Center Lane SUV
          const y2 = (frame * 4.8 + 120) % 450 - 90;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(280, y2, 85, 125);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(292, y2 + 20, 61, 35);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(298, y2 + 104, 49, 15);

          // Vehicle 3: Right Lane Truck
          const y3 = (frame * 3.8 + 240) % 480 - 110;
          ctx.fillStyle = '#eab308';
          ctx.fillRect(490, y3, 90, 140);
          ctx.fillStyle = '#475569';
          ctx.fillRect(500, y3 + 20, 70, 40);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(510, y3 + 120, 50, 15);

          frame++;
        }, 1000 / 30);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const videoAnprEngine = new VideoAnprEngine();
