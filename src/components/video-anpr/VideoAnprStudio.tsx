import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Video, Play, Pause, RotateCcw, FastForward, Rewind, 
  Camera, ShieldAlert, AlertTriangle, CheckCircle2, Sliders, 
  Cpu, Eye, EyeOff, Radio, Download, ExternalLink, RefreshCw, 
  Car, Gauge, Sparkles, X, ChevronRight, Bell, FileText, Search,
  Crop, Edit3, Database, Check, Layers, ArrowRight, UserCheck
} from 'lucide-react';
import { 
  VideoDetection, VehicleClass, ViolationType, Camera as CameraType, Vehicle 
} from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { 
  videoAnprEngine, VideoAnprConfig, TrackedVehicleObject 
} from '../../services/videoAnprEngine';
import { externalAnprService } from '../../services/anprService';
import { NavTab } from '../layout/Sidebar';
import { VehicleDossierModal } from '../tracking/VehicleDossierModal';

interface VideoAnprStudioProps {
  onNavigate: (tab: NavTab, meta?: any) => void;
  initialCamera?: CameraType | null;
}

export const VideoAnprStudio: React.FC<VideoAnprStudioProps> = ({
  onNavigate,
  initialCamera
}) => {
  const isDark = trafficStore.getTheme() === 'dark';

  // State for 360° RTO & Violations Dossier Modal
  const [dossierPlate, setDossierPlate] = useState<string | null>(null);

  // Video element & canvas overlay refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Media source state (Supports both Video and Image uploads)
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('sample-highway-traffic.webm');
  const [isGeneratingPreset, setIsGeneratingPreset] = useState<boolean>(false);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Detection & Overlays state
  const [detections, setDetections] = useState<VideoDetection[]>([]);
  const [trackedVehicles, setTrackedVehicles] = useState<TrackedVehicleObject[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<VideoDetection | null>(null);
  const [tripwireCrossings, setTripwireCrossings] = useState<string[]>([]);
  const [isOcrActive, setIsOcrActive] = useState<boolean>(true);

  // Interactive ROI & Plate Scanner tool state
  const [isRoiToolActive, setIsRoiToolActive] = useState<boolean>(false);
  const [roiStart, setRoiStart] = useState<{ x: number; y: number } | null>(null);
  const [roiCurrent, setRoiCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isScanningRoi, setIsScanningRoi] = useState<boolean>(false);

  // Plate Edit & Database Drawer State
  const [editingVehicle, setEditingVehicle] = useState<{ plate: string; newPlate: string; owner: string; state: string; type: VehicleClass } | null>(null);
  const [showDbDrawer, setShowDbDrawer] = useState<boolean>(false);
  const [autoRegisteredList, setAutoRegisteredList] = useState<Vehicle[]>([]);

  // HUD & Engine configuration
  const [config, setConfig] = useState<VideoAnprConfig>({
    speedLimitKmh: 80,
    sensitivity: 7,
    enableRadar: true,
    enablePlates: true,
    enableTripwire: true,
    virtualSignalColor: 'green',
    tripwireYPercent: 68,
    autoRegisterToDb: true
  });

  const [overlayLayers, setOverlayLayers] = useState({
    vehicleBoxes: true,
    plateHUD: true,
    speedRadar: true,
    tripwire: true,
    motionTrails: true
  });

  const [isProcessingFastScan, setIsProcessingFastScan] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type?: 'info' | 'success' | 'alert' } | null>(null);

  // Refresh auto-registered list from store
  const refreshDbList = useCallback(() => {
    setAutoRegisteredList(trafficStore.getAutoRegisteredVehicles());
  }, []);

  useEffect(() => {
    refreshDbList();
    const unsub = trafficStore.subscribe(refreshDbList);
    return () => unsub();
  }, [refreshDbList]);

  // Show temporary toast notification
  const showToast = (title: string, desc: string = '', type: 'info' | 'success' | 'alert' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Load default synthetic preset on initial mount
  useEffect(() => {
    loadSamplePreset('highway');
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Handle Preset Loading
  const loadSamplePreset = async (preset: 'highway' | 'junction' | 'night') => {
    try {
      setIsGeneratingPreset(true);
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        setWebcamStream(null);
        setIsWebcamActive(false);
      }
      setMediaType('video');
      setImageSrc(null);
      videoAnprEngine.reset();
      setDetections([]);
      setSelectedDetection(null);

      const result = await videoAnprEngine.generateSampleTrafficVideo(preset);
      setVideoSrc(result.blobUrl);
      setVideoName(`preset-${preset}-traffic.webm`);
      setIsGeneratingPreset(false);
      showToast(`Loaded ${preset.toUpperCase()} video stream`, 'AI Detection & Tesseract OCR active for universal plates.');
    } catch (err) {
      setIsGeneratingPreset(false);
      console.error('Failed to generate sample video:', err);
    }
  };

  const currentUploadedFileRef = useRef<File | null>(null);

  // Unified fast image processor with instant local AI + background cloud enrichment
  const processImageFile = async (file: File) => {
    currentUploadedFileRef.current = file;
    setMediaType('image');
    setVideoSrc(null);
    setImageSrc(URL.createObjectURL(file));
    setVideoName(file.name);
    setIsPlaying(false);
    videoAnprEngine.reset();
    setTrackedVehicles([]);
    setDetections([]);
    setSelectedDetection(null);

    // Background cloud Plate Recognizer enrichment
    externalAnprService.uploadAndRecognizeImage(
      file,
      'CAM-003',
      'Hebbal Flyover Main Deck',
      'Hebbal Flyover, Bengaluru'
    ).then(data => {
      if (data && data.success && data.detections && data.detections.length > 0) {
        refreshDbList();
        const resParts = (data.resolution || '1280x720').split('x').map(Number);
        const naturalW = resParts[0] || 1280;
        const naturalH = resParts[1] || 720;

        const serverTracked: TrackedVehicleObject[] = data.detections.map((d: any, idx: number) => {
          const obs = d.observed || d;
          const dbInfo = d.database || {};

          const vBbox = obs.vehicle_bbox || d.vehicle_bbox || [0, 0, 100, 100];
          const pBbox = obs.plate_bbox || d.plate_bbox || [0, 0, 50, 20];

          const vRelX = (vBbox[0] / naturalW) * 100;
          const vRelY = (vBbox[1] / naturalH) * 100;
          const vRelW = (vBbox[2] / naturalW) * 100;
          const vRelH = (vBbox[3] / naturalH) * 100;

          const pRelX = (pBbox[0] / naturalW) * 100;
          const pRelY = (pBbox[1] / naturalH) * 100;
          const pRelW = (pBbox[2] / naturalW) * 100;
          const pRelH = (pBbox[3] / naturalH) * 100;

          const plateNumber = (obs.plate_number || d.plate || 'UNREADABLE').toUpperCase();
          const anprConfidence = obs.anpr_confidence !== undefined ? obs.anpr_confidence : (d.confidence || 95);
          const countryCode = obs.country_code || d.format || 'IND';
          const vType = (obs.vehicle_type || d.vehicle_type || 'Car') as VehicleClass;
          const vColor = obs.vehicle_color || d.vehicle_color || 'White';

          return {
            trackId: `IMG-${idx + 1}`,
            status: 'RECOGNIZED',
            bbox: [vRelX, vRelY, vRelW, vRelH],
            bboxPixels: vBbox,
            plateBbox: [pRelX, pRelY, pRelW, pRelH],
            plate: plateNumber,
            detectedCountryFormat: countryCode,
            ocrConfidence: anprConfidence,
            rawOcrText: plateNumber,
            isAutoRegistered: true,
            type: vType,
            color: vColor,
            speed: 0,
            confidence: anprConfidence,
            lane: 1,
            lastSeenVideoTime: 0,
            firstSeenVideoTime: 0,
            history: [],
            isWatchlisted: dbInfo.is_watchlisted || d.is_watchlisted || false
          };
        });

        const serverDets: VideoDetection[] = serverTracked.map((trk, idx) => {
          const rawDet = data.detections[idx] || {};
          const obs = rawDet.observed || rawDet;

          return {
            id: `img-det-${Date.now()}-${idx + 1}`,
            videoTimeSec: 0,
            formattedTime: '00:00.0 (Cloud ANPR)',
            plate: trk.plate,
            vehicleType: trk.type,
            vehicleColor: trk.color,
            speed: 0,
            confidence: trk.confidence,
            laneNumber: 1,
            bboxVehicle: trk.bbox,
            bboxPlate: trk.plateBbox,
            isWatchlisted: trk.isWatchlisted,
            snapshotUrl: obs.snapshot_url || data.image_url || '',
            plateCropUrl: obs.plate_crop_url || rawDet.plate_crop_url || '',
            ocrConfidence: trk.ocrConfidence || 95,
            rawOcrText: trk.plate,
            isAutoRegistered: true,
            detectedCountryFormat: trk.detectedCountryFormat
          };
        });

        setTrackedVehicles(serverTracked);
        setDetections(serverDets);
        if (serverDets.length > 0) {
          setSelectedDetection(serverDets[0]);
          showToast(
            `Recognized ${serverDets.length} Plate(s)`,
            serverDets.map(d => `${d.plate} (${d.vehicleType})`).join(', ')
          );
        }
      }
    }).catch(err => {
      console.warn('Cloud ANPR fallback notice:', err);
    });
  };

  // Handle Custom Video or Image Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, forcedType?: 'video' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      setWebcamStream(null);
      setIsWebcamActive(false);
    }

    const isImg = forcedType === 'image' || file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);

    if (isImg) {
      processImageFile(file);
    } else {
      currentUploadedFileRef.current = null;
      setMediaType('video');
      setImageSrc(null);
      setVideoSrc(URL.createObjectURL(file));
      setVideoName(file.name);
      videoAnprEngine.reset();
      setDetections([]);
      setSelectedDetection(null);
      showToast(`Loaded Video: ${file.name}`, 'Scanning video frames with Universal OCR & Auto-Registration.');
    }
  };

  // Handle Drag and Drop Upload (supports both images and videos)
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        setWebcamStream(null);
        setIsWebcamActive(false);
      }
      const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);

      if (isImg) {
        processImageFile(file);
      } else {
        currentUploadedFileRef.current = null;
        setMediaType('video');
        setImageSrc(null);
        setVideoSrc(URL.createObjectURL(file));
        setVideoName(file.name);
        videoAnprEngine.reset();
        setDetections([]);
        setSelectedDetection(null);
        showToast(`Loaded Video: ${file.name}`, 'Scanning video frames with Universal OCR & Auto-Registration.');
      }
    }
  };

  // Process static image instantly when loaded onto the viewport
  const handleImageLoaded = async () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const container = overlayCanvasRef.current?.parentElement;
    if (overlayCanvasRef.current && container) {
      overlayCanvasRef.current.width = container.clientWidth || img.clientWidth || 640;
      overlayCanvasRef.current.height = container.clientHeight || img.clientHeight || 360;
    }
    try {
      const res = await videoAnprEngine.processStaticImage(img, config);
      if (res.trackedVehicles.length > 0) {
        setTrackedVehicles(res.trackedVehicles);
        if (res.newDetections.length > 0) {
          setDetections(res.newDetections);
          setSelectedDetection(res.newDetections[0]);
        }
      }
      refreshDbList();
    } catch (err) {
      console.error('Image scan error:', err);
    }
  };

  // Handle Webcam Toggle
  const toggleWebcam = async () => {
    if (isWebcamActive) {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        setWebcamStream(null);
      }
      setIsWebcamActive(false);
      loadSamplePreset('highway');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        setWebcamStream(stream);
        setIsWebcamActive(true);
        videoAnprEngine.reset();
        setDetections([]);
        setVideoSrc(null);
        setVideoName('Live Webcam Stream (ANPR Active)');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsPlaying(true);
        }
        showToast('Live Camera Active', 'Universal plate recognition & auto-registration running live on camera feed.');
      } catch (err) {
        console.error('Webcam access error:', err);
        showToast('Camera Permission Needed', 'Could not access webcam device.', 'alert');
      }
    }
  };

  // Video playback controls
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleStepFrame = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    video.currentTime = Math.max(0, Math.min(video.duration || 10, video.currentTime + deltaSeconds));
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Video/Image Frame Analysis & HUD Render Loop
  const renderFrameLoop = useCallback(() => {
    const video = videoRef.current;
    const image = imageRef.current;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const media = mediaType === 'image' ? image : video;
    if (!media) return;

    const container = canvas.parentElement;
    if (!container) return;
    const containerW = container.clientWidth || canvas.clientWidth || 640;
    const containerH = container.clientHeight || canvas.clientHeight || 360;

    if (canvas.width !== containerW || canvas.height !== containerH) {
      canvas.width = containerW;
      canvas.height = containerH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, containerW, containerH);

    const containerRect = container.getBoundingClientRect();
    const mediaRect = media.getBoundingClientRect();
    const mediaLeft = mediaRect.left - containerRect.left;
    const mediaTop = mediaRect.top - containerRect.top;
    const mediaW = mediaRect.width || containerW;
    const mediaH = mediaRect.height || containerH;

    if (mediaType === 'image') {
      // Draw overlays on image
      trackedVehicles.forEach(veh => {
        const vx = mediaLeft + (veh.bbox[0] / 100) * mediaW;
        const vy = mediaTop + (veh.bbox[1] / 100) * mediaH;
        const vw = (veh.bbox[2] / 100) * mediaW;
        const vh = (veh.bbox[3] / 100) * mediaH;

        const isWatch = veh.isWatchlisted;
        let boxColor = isWatch ? '#ef4444' : '#10b981';

        if (overlayLayers.vehicleBoxes) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = boxColor;
          ctx.strokeRect(vx, vy, vw, vh);

          // Tech Corner Reticles
          const bLen = Math.min(14, vw * 0.25);
          ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(vx, vy + bLen); ctx.lineTo(vx, vy); ctx.lineTo(vx + bLen, vy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(vx + vw - bLen, vy); ctx.lineTo(vx + vw, vy); ctx.lineTo(vx + vw, vy + bLen); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(vx, vy + vh - bLen); ctx.lineTo(vx, vy + vh); ctx.lineTo(vx + bLen, vy + vh); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(vx + vw - bLen, vy + vh); ctx.lineTo(vx + vw, vy + vh); ctx.lineTo(vx + vw, vy + vh - bLen); ctx.stroke();

          // Vehicle Category Tag
          const hasValidPlate = veh.plate && veh.plate !== 'SCANNING...' && veh.plate !== 'UNREADABLE' && veh.plate.length >= 3;
          // Sleek Glassmorphism Vehicle Classification Header
          const tagH = 22;
          const labelText = veh.makeModel ? `${veh.type.toUpperCase()} • ${veh.makeModel}` : (hasValidPlate ? `${veh.type.toUpperCase()} • ${veh.plate}` : `${veh.type.toUpperCase()} • ${veh.color}`);
          const tagW = Math.max(140, Math.min(280, vw * 0.95));
          const tagX = vx;
          const tagY = (vy - tagH - 4) >= 0 ? (vy - tagH - 4) : (vy + 4);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagW, tagH, [4]);
          ctx.fill();
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Left Color Accent
          ctx.fillStyle = boxColor;
          ctx.fillRect(tagX + 2, tagY + 3, 3.5, tagH - 6);

          // Crisp High-Contrast Text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillText(labelText, tagX + 9, tagY + 14);
        }

        if (overlayLayers.plateHUD && config.enablePlates) {
          const hasValidPlate = veh.plate && veh.plate !== 'SCANNING...' && veh.plate !== 'UNREADABLE' && veh.plate.length >= 3;
          if (hasValidPlate) {
            const px = mediaLeft + (veh.plateBbox[0] / 100) * mediaW;
            const py = mediaTop + (veh.plateBbox[1] / 100) * mediaH;
            const pw = (veh.plateBbox[2] / 100) * mediaW;
            const ph = (veh.plateBbox[3] / 100) * mediaH;

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fef08a';
            ctx.strokeRect(px, py, pw, ph);

            const bannerW = Math.max(130, pw + 20);
            const bannerH = 24;
            const bannerX = Math.max(4, Math.min(containerW - bannerW - 4, px + pw / 2 - bannerW / 2));
            const bannerY = Math.min(containerH - 28, py + ph + 4);

            ctx.fillStyle = isWatch ? 'rgba(239, 68, 68, 0.95)' : 'rgba(15, 23, 42, 0.92)';
            ctx.beginPath();
            ctx.roundRect(bannerX, bannerY, bannerW, bannerH, [4]);
            ctx.fill();
            ctx.strokeStyle = isWatch ? '#fca5a5' : '#fef08a';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(bannerX + 10, bannerY + 12, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(veh.plate, bannerX + bannerW / 2 + 5, bannerY + 16);
            ctx.textAlign = 'left';
          }
        }
      });

      // ROI Drag Rectangle
      if (isRoiToolActive && roiStart && roiCurrent) {
        const rx = mediaLeft + Math.min(roiStart.x, roiCurrent.x);
        const ry = mediaTop + Math.min(roiStart.y, roiCurrent.y);
        const rw = Math.abs(roiCurrent.x - roiStart.x);
        const rh = Math.abs(roiCurrent.y - roiStart.y);

        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#06b6d4';
        ctx.strokeRect(rx, ry, rw, rh);

        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(rx, ry - 20, 140, 20);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
        ctx.fillText('SCANNING ROI FOR OCR', rx + 4, ry - 6);
      }
    } else if (video && video.readyState >= 1) {
      // Run computer vision frame analyzer with real OCR
      const analysis = videoAnprEngine.processFrame(video, config);
      setTrackedVehicles(analysis.trackedVehicles);
      setTripwireCrossings(analysis.currentTripwireCrossings);

      // Maintain clean, deduplicated vehicle records by track_id
      if (analysis.newDetections.length > 0) {
        setDetections(prev => {
          const map = new Map<string, VideoDetection>();
          // Load previous detections
          prev.forEach(d => map.set(d.id, d));

          // Upsert / update unique vehicle records
          analysis.newDetections.forEach(d => {
            const existing = map.get(d.id);
            if (!existing) {
              map.set(d.id, d);
            } else {
              // Only overwrite plate/confidence if new result has equal or higher confidence
              const existingConf = existing.ocrConfidence || 0;
              const newConf = d.ocrConfidence || 0;
              const hasNewPlate = d.plate && d.plate !== 'ANALYZING' && d.plate !== 'UNREADABLE' && d.plate !== 'TRACKING';
              const hasOldPlate = existing.plate && existing.plate !== 'ANALYZING' && existing.plate !== 'UNREADABLE' && existing.plate !== 'TRACKING';

              map.set(d.id, {
                ...existing,
                ...d,
                plate: (hasOldPlate && !hasNewPlate) ? existing.plate : (newConf >= existingConf ? d.plate : existing.plate),
                ocrConfidence: Math.max(existingConf, newConf),
                snapshotUrl: (d.snapshotUrl && hasNewPlate) ? d.snapshotUrl : (existing.snapshotUrl || d.snapshotUrl),
                plateCropUrl: (d.plateCropUrl && hasNewPlate) ? d.plateCropUrl : (existing.plateCropUrl || d.plateCropUrl),
                rawOcrText: (hasOldPlate && !hasNewPlate) ? existing.rawOcrText : (newConf >= existingConf ? d.rawOcrText : existing.rawOcrText)
              });
            }
          });

          return Array.from(map.values()).sort((a, b) => (b.videoTimeSec || 0) - (a.videoTimeSec || 0));
        });

        const latest = analysis.newDetections.find(d => d.plate && d.plate !== 'SCANNING...' && d.plate !== 'ANALYZING' && d.plate !== 'UNREADABLE' && d.plate !== 'TRACKING');
        if (latest) {
          showToast(`Auto-Registered: ${latest.plate}`, `${latest.vehicleColor} ${latest.vehicleType} • ${latest.ocrConfidence || 95}% confidence`);
        }
      }

      // 1. Draw Tripwire Stop Line
      if (overlayLayers.tripwire && config.enableTripwire) {
        const tripY = mediaTop + (config.tripwireYPercent / 100) * mediaH;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = config.virtualSignalColor === 'red' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.8)';
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(mediaLeft + 10, tripY);
        ctx.lineTo(mediaLeft + mediaW - 10, tripY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = config.virtualSignalColor === 'red' ? '#ef4444' : '#10b981';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(
          `VIRTUAL STOP-LINE [SIGNAL: ${config.virtualSignalColor.toUpperCase()}]`, 
          mediaLeft + 16, 
          tripY - 6
        );
      }

      // 2. Draw Tracked Vehicles Overlays
      analysis.trackedVehicles.forEach(veh => {
        const vx = mediaLeft + (veh.bbox[0] / 100) * mediaW;
        const vy = mediaTop + (veh.bbox[1] / 100) * mediaH;
        const vw = (veh.bbox[2] / 100) * mediaW;
        const vh = (veh.bbox[3] / 100) * mediaH;

        const isOverspeed = config.enableRadar && veh.speed > Math.max(80, config.speedLimitKmh);
        const isWatch = veh.isWatchlisted;
        const hasValidPlate = veh.plate && veh.plate !== 'SCANNING...' && veh.plate !== 'UNREADABLE' && veh.plate.length >= 3;

        let boxColor = '#10b981';
        if (isWatch) boxColor = '#ef4444';
        else if (isOverspeed) boxColor = '#f43f5e';

        // Vehicle Box & Corner Brackets
        if (overlayLayers.vehicleBoxes) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = boxColor;
          ctx.strokeRect(vx, vy, vw, vh);

          const bLen = Math.min(14, vw * 0.25);
          ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(vx, vy + bLen); ctx.lineTo(vx, vy); ctx.lineTo(vx + bLen, vy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(vx + vw - bLen, vy); ctx.lineTo(vx + vw, vy); ctx.lineTo(vx + vw, vy + bLen); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(vx, vy + vh - bLen); ctx.lineTo(vx, vy + vh); ctx.lineTo(vx + bLen, vy + vh); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(vx + vw - bLen, vy + vh); ctx.lineTo(vx + vw, vy + vh); ctx.lineTo(vx + vw, vy + vh - bLen); ctx.stroke();

          // Sleek Glassmorphism Vehicle Classification Header
          const tagH = 22;
          const labelText = veh.makeModel ? `${veh.type.toUpperCase()} • ${veh.makeModel}` : `${veh.type.toUpperCase()} • ${veh.color}`;
          const tagW = Math.max(140, Math.min(280, vw * 0.95));
          const tagX = vx;
          const tagY = (vy - tagH - 4) >= 0 ? (vy - tagH - 4) : (vy + 4);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagW, tagH, [4]);
          ctx.fill();
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Left Color Accent
          ctx.fillStyle = boxColor;
          ctx.fillRect(tagX + 2, tagY + 3, 3.5, tagH - 6);

          // Crisp High-Contrast Text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillText(labelText, tagX + 9, tagY + 14);
        }

        // License Plate HUD Box with Optical Recognition Telemetry (ONLY when plate is read)
        if (overlayLayers.plateHUD && config.enablePlates && hasValidPlate) {
          const px = mediaLeft + (veh.plateBbox[0] / 100) * mediaW;
          const py = mediaTop + (veh.plateBbox[1] / 100) * mediaH;
          const pw = (veh.plateBbox[2] / 100) * mediaW;
          const ph = (veh.plateBbox[3] / 100) * mediaH;

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fef08a';
          ctx.strokeRect(px, py, pw, ph);

          const bannerW = Math.max(140, pw + 24);
          const bannerH = 26;
          const bannerX = Math.max(4, Math.min(containerW - bannerW - 4, px + pw / 2 - bannerW / 2));
          const bannerY = Math.min(containerH - 30, py + ph + 4);

          ctx.fillStyle = isWatch ? 'rgba(239, 68, 68, 0.95)' : 'rgba(15, 23, 42, 0.95)';
          ctx.beginPath();
          ctx.roundRect(bannerX, bannerY, bannerW, bannerH, [4]);
          ctx.fill();
          ctx.strokeStyle = isWatch ? '#fca5a5' : '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(bannerX + 10, bannerY + 13, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${veh.plate} (${veh.ocrConfidence || 95}%)`, bannerX + bannerW / 2 + 6, bannerY + 17);
          ctx.textAlign = 'left';
        }

        // Speed Radar Telemetry
        if (overlayLayers.speedRadar && config.enableRadar) {
          const tagX = vx + vw + 6;
          const tagY = vy + 16;
          if (tagX + 85 < containerW) {
            const tagW = isOverspeed ? 98 : 72;
            ctx.fillStyle = isOverspeed ? 'rgba(239, 68, 68, 0.95)' : 'rgba(2, 132, 199, 0.85)';
            ctx.fillRect(tagX, tagY - 14, tagW, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.fillText(isOverspeed ? `⚡ ${veh.speed} km/h` : `${veh.speed} km/h`, tagX + 5, tagY - 1);
          }
        }

        // Motion Trajectory Trail
        if (overlayLayers.motionTrails && veh.history.length > 2) {
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          veh.history.forEach((pt, idx) => {
            const hx = mediaLeft + (pt.x / 100) * mediaW;
            const hy = mediaTop + (pt.y / 100) * mediaH;
            if (idx === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          });
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // 3. Draw Interactive ROI Selection Box if user is dragging
      if (isRoiToolActive && roiStart && roiCurrent) {
        const rx = mediaLeft + Math.min(roiStart.x, roiCurrent.x);
        const ry = mediaTop + Math.min(roiStart.y, roiCurrent.y);
        const rw = Math.abs(roiCurrent.x - roiStart.x);
        const rh = Math.abs(roiCurrent.y - roiStart.y);

        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#06b6d4';
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.setLineDash([]);

        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(rx, ry - 20, 140, 20);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
        ctx.fillText('SCANNING ROI FOR OCR', rx + 4, ry - 6);
      }
    }

    animationFrameRef.current = requestAnimationFrame(renderFrameLoop);
  }, [config, overlayLayers, isRoiToolActive, roiStart, roiCurrent, mediaType, trackedVehicles]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(renderFrameLoop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderFrameLoop]);

  // Handle ROI Mouse Events for manual plate cropping
  const handleMouseDownOnVideo = (e: React.MouseEvent<HTMLDivElement>) => {
    const media = videoRef.current || imageRef.current;
    if (!isRoiToolActive || !media) return;
    const rect = media.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRoiStart({ x, y });
    setRoiCurrent({ x, y });
  };

  const handleMouseMoveOnVideo = (e: React.MouseEvent<HTMLDivElement>) => {
    const media = videoRef.current || imageRef.current;
    if (!isRoiToolActive || !roiStart || !media) return;
    const rect = media.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRoiCurrent({ x, y });
  };

  const handleMouseUpOnVideo = async () => {
    const media = videoRef.current || imageRef.current;
    if (!isRoiToolActive || !roiStart || !roiCurrent || !media) {
      setRoiStart(null);
      setRoiCurrent(null);
      return;
    }

    const rx = Math.min(roiStart.x, roiCurrent.x);
    const ry = Math.min(roiStart.y, roiCurrent.y);
    const rw = Math.abs(roiCurrent.x - roiStart.x);
    const rh = Math.abs(roiCurrent.y - roiStart.y);

    setRoiStart(null);
    setRoiCurrent(null);
    setIsRoiToolActive(false);

    if (rw < 20 || rh < 10) {
      showToast('ROI Selection Too Small', 'Please drag a larger box around the plate.', 'alert');
      return;
    }

    try {
      setIsScanningRoi(true);
      const naturalW = videoRef.current ? (videoRef.current.videoWidth || 640) : (imageRef.current?.naturalWidth || 640);
      const naturalH = videoRef.current ? (videoRef.current.videoHeight || 360) : (imageRef.current?.naturalHeight || 360);
      const clientW = media.clientWidth || 640;
      const clientH = media.clientHeight || 360;

      const scaleX = naturalW / clientW;
      const scaleY = naturalH / clientH;

      const result = await videoAnprEngine.runInstantOcrOnCrop(
        media,
        rx * scaleX,
        ry * scaleY,
        rw * scaleX,
        rh * scaleY
      );

      setIsScanningRoi(false);
      showToast(
        `OCR Detected: ${result.plate}`, 
        `Confidence: ${result.confidence}% (${result.format}). Automatically registered into database!`
      );
      refreshDbList();
    } catch (err) {
      setIsScanningRoi(false);
      showToast('ROI Scan Error', 'Could not read text from selected region.', 'alert');
    }
  };

  // Capture Snapshot of current frame or image
  const handleCaptureSnapshot = () => {
    const media = videoRef.current || imageRef.current;
    if (!media) return;
    const dataUrl = videoAnprEngine.cropVehicleSnapshot(media, [20, 20, 60, 60]);
    const link = document.createElement('a');
    link.download = `anpr-snapshot-${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();
    showToast('Snapshot Captured', 'Image saved and downloaded.');
  };

  // Issue formal violation challan
  const handleIssueViolation = (det: VideoDetection) => {
    trafficStore.recordVideoViolation({
      vehicleId: `veh-vid-${det.plate}`,
      plate: det.plate,
      cameraCode: initialCamera?.code || 'CAM-V01',
      location: initialCamera?.location || 'Video ANPR Analysis Lab',
      timestamp: new Date().toISOString(),
      violationType: det.violation?.type || 'Speeding',
      speedLimit: 60,
      recordedSpeed: det.speed,
      fineAmount: det.violation?.challanAmount || 2000,
      confidence: det.confidence,
      vehicleType: det.vehicleType,
      vehicleColor: det.vehicleColor,
      evidenceImage: det.snapshotUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      notes: `Optical violation verified in video stream at timestamp ${det.formattedTime}.`
    });
    setDetections(prev => prev.map(d => d.id === det.id ? { ...d, pushedToSystem: true } : d));
    showToast(`Issued e-Challan for ${det.plate}`, 'Recorded in central violations registry.');
  };

  // Add detected plate to Watchlist
  const handleAddToWatchlist = (plate: string, type: VehicleClass) => {
    trafficStore.addToWatchlist({
      plate,
      vehicleType: type,
      color: 'Detected',
      reason: 'Flagged via Video ANPR Optical Recognition',
      priority: 'High',
      notes: 'Added from video surveillance review session',
      addedBy: 'Video ANPR Operator',
      isActive: true
    });
    setDetections(prev => prev.map(d => d.plate === plate ? { ...d, isWatchlisted: true } : d));
    showToast(`Added ${plate} to Watchlist`, 'Real-time alert active across city cameras.');
  };

  // Save edited plate
  const handleSavePlateEdit = () => {
    if (!editingVehicle) return;
    const cleanPlate = editingVehicle.newPlate.toUpperCase().trim().replace(/[\s-]/g, '');
    if (!cleanPlate) return;

    trafficStore.updateVehicleDetails(editingVehicle.plate, {
      plate: cleanPlate,
      registeredOwner: editingVehicle.owner,
      registeredState: editingVehicle.state,
      type: editingVehicle.type
    });

    setDetections(prev => prev.map(d => d.plate === editingVehicle.plate ? { ...d, plate: cleanPlate } : d));
    showToast(`Updated Plate: ${cleanPlate}`, 'Synchronized across central database.');
    setEditingVehicle(null);
    refreshDbList();
  };

  // Full Fast Scan of the video
  const handleRunFastScan = async () => {
    const video = videoRef.current;
    if (!video || !duration) return;

    setIsProcessingFastScan(true);
    setScanProgress(0);
    const originalTime = video.currentTime;
    const wasPlaying = !video.paused;
    video.pause();

    const step = Math.max(0.5, duration / 20);
    const foundDetections: VideoDetection[] = [];

    for (let t = 0; t <= duration; t += step) {
      video.currentTime = t;
      await new Promise(r => setTimeout(r, 60));
      const analysis = videoAnprEngine.processFrame(video, config);
      if (analysis.newDetections.length > 0) {
        foundDetections.push(...analysis.newDetections);
      }
      setScanProgress(Math.round((t / duration) * 100));
    }

    setDetections(prev => {
      const merged = [...foundDetections, ...prev];
      return merged.slice(0, 60);
    });

    video.currentTime = originalTime;
    if (wasPlaying) video.play();
    setIsProcessingFastScan(false);
    setScanProgress(100);
    showToast(`Fast Video Scan Complete`, `Extracted & auto-registered ${foundDetections.length} vehicles.`);
    refreshDbList();
  };

  // Export database
  const handleExportCsv = () => {
    const csv = trafficStore.exportRegisteredVehiclesCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tmc-registered-plates-${Date.now()}.csv`;
    link.click();
    showToast('Exported CSV Database', 'File downloaded successfully.');
  };

  // Styling helpers
  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold transition-all ${
          toastMessage.type === 'alert' 
            ? 'bg-rose-500 text-white border-rose-400' 
            : 'bg-emerald-500 text-slate-950 border-emerald-400'
        }`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-bold">{toastMessage.title}</div>
            {toastMessage.desc && <div className="text-xs opacity-90">{toastMessage.desc}</div>}
          </div>
        </div>
      )}

      {/* Page Header & Source Bar */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b ${dividerBorder}`}>
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>
                  Universal Video ANPR & Auto-Registration Studio
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Tesseract OCR & Universal Plate Engine Active
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${textMuted}`}>
                Detects all real license plates in video or live camera feeds (Indian, US, EU & Universal Formats). Automatically registers all identified vehicles into TMC central database for continuous tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Header */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input 
            type="file" 
            ref={videoFileInputRef} 
            onChange={(e) => handleFileUpload(e, 'video')} 
            accept="video/*,.mp4,.mov,.avi,.mkv,.webm" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={imageFileInputRef} 
            onChange={(e) => handleFileUpload(e, 'image')} 
            accept="image/*,.jpg,.jpeg,.png,.webp,.bmp" 
            className="hidden" 
          />

          <button
            type="button"
            onClick={() => videoFileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Traffic Video</span>
          </button>

          <button
            type="button"
            onClick={() => imageFileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-sm transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Upload Traffic Image</span>
          </button>

          <button
            type="button"
            onClick={toggleWebcam}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
              isWebcamActive 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                : isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
            }`}
          >
            <Radio className={`w-4 h-4 ${isWebcamActive ? 'animate-pulse text-rose-400' : ''}`} />
            <span>{isWebcamActive ? 'Stop Camera' : 'Use Live Camera'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDbDrawer(!showDbDrawer)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Database className="w-4 h-4" />
            <span>Registered DB ({autoRegisteredList.length})</span>
          </button>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-700">
            <span className={`text-xs font-mono ${textMuted}`}>Presets:</span>
            <button
              type="button"
              disabled={isGeneratingPreset}
              onClick={() => loadSamplePreset('highway')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
            >
              Highway
            </button>
            <button
              type="button"
              disabled={isGeneratingPreset}
              onClick={() => loadSamplePreset('junction')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
            >
              Junction
            </button>
            <button
              type="button"
              disabled={isGeneratingPreset}
              onClick={() => loadSamplePreset('night')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
            >
              Night
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Left 8 Cols (Video/Image + HUD + Scrubber), Right 4 Cols (Detection Feed & Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Video/Image Viewport & Playback Bar (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Video / Image Container Box */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onMouseDown={handleMouseDownOnVideo}
            onMouseMove={handleMouseMoveOnVideo}
            onMouseUp={handleMouseUpOnVideo}
            className={`relative rounded-2xl overflow-hidden border ${dividerBorder} bg-black shadow-2xl group select-none ${isRoiToolActive ? 'cursor-crosshair ring-2 ring-cyan-400' : ''}`}
            style={{ minHeight: '440px' }}
          >
            {/* HTML5 Video Element */}
            {mediaType === 'video' && videoSrc && (
              <video
                ref={videoRef}
                src={videoSrc}
                loop={isLooping}
                muted
                autoPlay
                playsInline
                onLoadedMetadata={handleLoadedMetadata}
                onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-auto max-h-[560px] object-contain block mx-auto"
              />
            )}

            {/* Uploaded Static Image Element */}
            {mediaType === 'image' && imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Uploaded ANPR Image"
                onLoad={handleImageLoaded}
                className="w-full h-auto max-h-[560px] object-contain block mx-auto"
              />
            )}

            {isWebcamActive && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-auto max-h-[560px] object-contain block mx-auto"
              />
            )}

            {/* Overlaid Computer Vision HUD Canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

            {/* Loading Indicator */}
            {isGeneratingPreset && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 z-30">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-sm font-semibold text-emerald-400">Synthesizing Sample Traffic Stream...</p>
              </div>
            )}

            {/* Top Live Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-neutral-950/80 text-emerald-400 border border-neutral-700/80 backdrop-blur-md flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${mediaType === 'image' ? 'bg-cyan-400' : 'bg-emerald-400'} animate-ping`} />
                  {isWebcamActive ? 'LIVE WEBCAM STREAM' : mediaType === 'image' ? `IMAGE: ${videoName.toUpperCase()}` : videoName.toUpperCase()}
                </span>
                <span className="px-2 py-1 rounded-md text-xs font-mono bg-neutral-950/80 text-neutral-300 border border-neutral-700/80 backdrop-blur-md">
                  {trackedVehicles.length} Target{trackedVehicles.length === 1 ? '' : 's'} in Frame
                </span>
              </div>

              {/* Tools & Signal */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsRoiToolActive(!isRoiToolActive)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                    isRoiToolActive 
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg animate-pulse' 
                      : 'bg-neutral-950/80 border border-neutral-700 text-cyan-400 hover:bg-neutral-900'
                  }`}
                  title="Click and drag to scan any license plate directly with OCR"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>{isRoiToolActive ? 'Drag Box on Plate' : 'Manual ROI OCR'}</span>
                </button>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-950/80 border border-neutral-700/80 backdrop-blur-md text-xs font-mono">
                  <span className="text-neutral-400">Signal:</span>
                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, virtualSignalColor: c.virtualSignalColor === 'green' ? 'red' : 'green' }))}
                    className={`font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                      config.virtualSignalColor === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {config.virtualSignalColor.toUpperCase()}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Floating Scrubber / Image Mode Overlay */}
            <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-neutral-950/85 border border-neutral-800/80 backdrop-blur-md flex flex-col gap-2 z-20 transition-opacity">
              {mediaType === 'image' ? (
                <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-bold flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>HIGH-RES IMAGE ANPR MODE</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (currentUploadedFileRef.current) {
                          processImageFile(currentUploadedFileRef.current);
                        } else {
                          handleImageLoaded();
                        }
                      }}
                      className="p-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 flex items-center gap-1.5 font-semibold cursor-pointer border border-cyan-500/30 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Rescan Plate & Attributes</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-400 font-mono text-xs">
                      {trackedVehicles.length} vehicle(s) recognized
                    </span>
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1 cursor-pointer"
                      title="Save Image Snapshot"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Snapshot</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>

                  {/* Transport Buttons Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-xs flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="p-2 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStepFrame(-0.5)}
                        title="Step back 0.5s"
                        className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                      >
                        <Rewind className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStepFrame(0.5)}
                        title="Step forward 0.5s"
                        className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSeek(0)}
                        title="Restart"
                        className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <span className="font-mono text-neutral-300 pl-2">
                        {videoAnprEngine.formatTime(currentTime)} / {videoAnprEngine.formatTime(duration)}
                      </span>
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-neutral-400">
                        <span>Speed:</span>
                        {[0.5, 1, 2].map(speed => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => handleSpeedChange(speed)}
                            className={`px-1.5 py-0.5 rounded font-mono ${playbackSpeed === speed ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'hover:text-white cursor-pointer'}`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1 cursor-pointer"
                        title="Capture Frame Evidence"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Snapshot</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Overlays & Calibration Toolbar */}
          <div className={`${cardBg} border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs`}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`font-semibold ${textTitle} flex items-center gap-1.5`}>
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Visual Layers:</span>
              </span>
              
              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                <input 
                  type="checkbox" 
                  checked={overlayLayers.vehicleBoxes} 
                  onChange={(e) => setOverlayLayers(l => ({ ...l, vehicleBoxes: e.target.checked }))} 
                  className="rounded accent-emerald-400" 
                />
                <span>Vehicle Box</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                <input 
                  type="checkbox" 
                  checked={overlayLayers.plateHUD} 
                  onChange={(e) => setOverlayLayers(l => ({ ...l, plateHUD: e.target.checked }))} 
                  className="rounded accent-emerald-400" 
                />
                <span>Plate OCR</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                <input 
                  type="checkbox" 
                  checked={overlayLayers.speedRadar} 
                  onChange={(e) => setOverlayLayers(l => ({ ...l, speedRadar: e.target.checked }))} 
                  className="rounded accent-emerald-400" 
                />
                <span>Speed Radar</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                <input 
                  type="checkbox" 
                  checked={overlayLayers.tripwire} 
                  onChange={(e) => setOverlayLayers(l => ({ ...l, tripwire: e.target.checked }))} 
                  className="rounded accent-emerald-400" 
                />
                <span>Stop-Line</span>
              </label>
            </div>

            {/* Radar Speed Limit Slider */}
            <div className="flex items-center gap-2 text-neutral-300">
              <Gauge className="w-4 h-4 text-amber-400" />
              <span>Speed Limit:</span>
              <input 
                type="range" 
                min={30} 
                max={100} 
                step={5}
                value={config.speedLimitKmh} 
                onChange={(e) => setConfig(c => ({ ...c, speedLimitKmh: parseInt(e.target.value) }))}
                className="w-24 accent-amber-400 cursor-pointer" 
              />
              <span className="font-mono font-bold text-amber-400">{config.speedLimitKmh} km/h</span>
            </div>

            {/* Batch Fast Scan Button */}
            <button
              type="button"
              disabled={isProcessingFastScan}
              onClick={handleRunFastScan}
              className="px-3.5 py-1.5 rounded-xl font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${isProcessingFastScan ? 'animate-spin' : ''}`} />
              <span>{isProcessingFastScan ? `Scanning... ${scanProgress}%` : 'Fast Video Scan'}</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`${cardBg} border rounded-xl p-3`}>
              <div className="text-xs text-neutral-400">Total Detections</div>
              <div className="text-xl font-mono font-bold text-white mt-1">{detections.length}</div>
            </div>
            <div className={`${cardBg} border rounded-xl p-3`}>
              <div className="text-xs text-neutral-400">Auto-Registered Plates</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                {autoRegisteredList.length}
              </div>
            </div>
            <div className={`${cardBg} border rounded-xl p-3`}>
              <div className="text-xs text-neutral-400">Violations Flagged</div>
              <div className="text-xl font-mono font-bold text-amber-400 mt-1">
                {detections.filter(d => d.violation).length}
              </div>
            </div>
            <div className={`${cardBg} border rounded-xl p-3`}>
              <div className="text-xs text-neutral-400">Watchlist Hits</div>
              <div className="text-xl font-mono font-bold text-red-400 mt-1">
                {detections.filter(d => d.isWatchlisted).length}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Detection Stream Feed & Action Panel (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Header of Stream */}
          <div className={`${cardBg} border rounded-2xl p-4 flex flex-col h-[640px]`}>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className={`text-sm font-bold ${textTitle}`}>Real-Time Detections</h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {detections.length} Events
              </span>
            </div>

            {/* Detections List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
              {detections.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                  <Car className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-medium">No vehicles detected yet</p>
                  <p className="text-[11px] mt-1 text-neutral-600">Play video, use live camera, or drag an ROI box to recognize plates.</p>
                </div>
              ) : (
                detections.map(det => (
                  <div
                    key={det.id}
                    onClick={() => setSelectedDetection(det)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedDetection?.id === det.id
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : isDark ? 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {/* Plate & Auto-Registered Tag */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-sm text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30">
                            {det.plate}
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            Registered
                          </span>
                          {det.isWatchlisted && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white animate-pulse">
                              WATCHLIST
                            </span>
                          )}
                        </div>

                        {/* Vehicle details */}
                        <div className="text-xs text-neutral-400 mt-1.5 flex items-center gap-2">
                          <span>{det.vehicleColor} {det.vehicleType}</span>
                          <span>•</span>
                          <span className={det.speed > config.speedLimitKmh ? 'text-amber-400 font-bold' : 'text-neutral-300'}>
                            {det.speed} km/h
                          </span>
                        </div>

                        {/* OCR Confidence & Format */}
                        <div className="text-[11px] text-cyan-400 font-mono mt-1">
                          OCR: {det.ocrConfidence || 95}% {det.detectedCountryFormat ? `• ${det.detectedCountryFormat}` : ''}
                        </div>
                      </div>

                      {/* Video timestamp & snapshot preview */}
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-mono text-neutral-400">
                          {det.formattedTime}
                        </span>
                        {det.snapshotUrl && (
                          <img 
                            src={det.snapshotUrl} 
                            alt="Crop" 
                            className="w-12 h-8 object-cover rounded border border-neutral-700 mt-1" 
                          />
                        )}
                      </div>
                    </div>

                    {/* Violation Alert Banner if present */}
                    {det.violation && (
                      <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {det.violation.type}
                        </span>
                        <span className="font-mono font-bold">₹{det.violation.challanAmount}</span>
                      </div>
                    )}

                    {/* Quick action buttons */}
                    <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSeek(det.videoTimeSec);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Seek</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDossierPlate(det.plate);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 cursor-pointer flex items-center gap-1"
                          title="View 360° RTO & Violations Dossier"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingVehicle({
                              plate: det.plate,
                              newPlate: det.plate,
                              owner: '',
                              state: det.detectedCountryFormat || 'Registered',
                              type: det.vehicleType
                            });
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer flex items-center gap-1"
                          title="Correct plate number or edit details"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIssueViolation(det);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 cursor-pointer"
                        >
                          e-Challan
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Vehicle Intelligence & Telemetry Card in Right Panel */}
            {selectedDetection ? (
              <div className="mt-3 p-3.5 rounded-xl bg-neutral-900/90 border border-emerald-500/40 text-xs space-y-3 shadow-xl backdrop-blur-md">
                {/* Header: Plate, Source & Close */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-extrabold text-base text-yellow-400 bg-yellow-400/15 px-2.5 py-1 rounded border border-yellow-400/40 tracking-wider">
                      {selectedDetection.plate}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                      {selectedDetection.detectedCountryFormat || 'GLOBAL'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      {selectedDetection.isAutoRegistered ? 'DB MATCHED' : 'NEW SIGHTING'}
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSelectedDetection(null)}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 360 RTO & Violations Intelligence Hero Button */}
                <button
                  type="button"
                  onClick={() => setDossierPlate(selectedDetection.plate)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all text-xs tracking-wide"
                >
                  <FileText className="w-4 h-4" />
                  <span>View 360° RTO Dossier & Violations</span>
                </button>

                {/* Evidence Thumbnails: Vehicle Snapshot & Plate Crop */}
                <div className="flex items-center gap-2">
                  {selectedDetection.snapshotUrl && (
                    <div className="flex-1 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 relative">
                      <img src={selectedDetection.snapshotUrl} alt="Vehicle Evidence" className="w-full h-16 object-cover" />
                      <span className="absolute bottom-0.5 left-1 text-[9px] font-mono text-neutral-300 bg-black/70 px-1 rounded">Target</span>
                    </div>
                  )}
                  {selectedDetection.plateCropUrl && (
                    <div className="w-28 rounded-lg overflow-hidden border border-amber-500/30 bg-neutral-950 relative">
                      <img src={selectedDetection.plateCropUrl} alt="Plate Crop" className="w-full h-16 object-contain bg-black/90 p-0.5" />
                      <span className="absolute bottom-0.5 left-1 text-[9px] font-mono text-amber-300 bg-black/70 px-1 rounded">OCR ROI</span>
                    </div>
                  )}
                </div>

                {/* Vehicle Attributes Grid */}
                <div className="grid grid-cols-2 gap-2 text-neutral-300">
                  <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">Vehicle Class</div>
                    <div className="font-bold text-white text-xs mt-0.5">{selectedDetection.vehicleColor} {selectedDetection.vehicleType}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">ANPR Source</div>
                    <div className="font-bold text-cyan-400 text-xs mt-0.5 truncate">Plate Recognizer AI</div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">Radar Speed</div>
                    <div className={`font-bold font-mono text-xs mt-0.5 ${selectedDetection.speed > config.speedLimitKmh ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {selectedDetection.speed > 0 ? `${selectedDetection.speed} km/h` : 'Static Snapshot'} <span className="text-[10px] text-neutral-400 font-normal">({selectedDetection.speed > config.speedLimitKmh ? 'Over Limit' : 'Compliant'})</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">ANPR Confidence</div>
                    <div className="font-bold font-mono text-emerald-400 text-xs mt-0.5">
                      {selectedDetection.ocrConfidence || selectedDetection.confidence}% Match
                    </div>
                  </div>
                </div>

                {/* Violation Status */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                  selectedDetection.violation 
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                }`}>
                  <div className="flex items-center gap-1.5 font-semibold">
                    {selectedDetection.violation ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Violation: {selectedDetection.violation.type}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>No Traffic Violations Detected</span>
                      </>
                    )}
                  </div>
                  {selectedDetection.violation && (
                    <span className="font-mono font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded">
                      ₹{selectedDetection.violation.challanAmount}
                    </span>
                  )}
                </div>

                {/* Time & Camera Location */}
                <div className="text-[11px] text-neutral-400 flex items-center justify-between px-1">
                  <span>Time: <span className="font-mono text-neutral-200">{selectedDetection.formattedTime}</span></span>
                  <span>Lane: <span className="font-mono text-neutral-200">#{selectedDetection.laneNumber}</span></span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigate('tracking', { plate: selectedDetection.plate })}
                    className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors text-xs"
                  >
                    <Search className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Track Vehicle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddToWatchlist(selectedDetection.plate, selectedDetection.vehicleType)}
                    className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer border border-rose-500/30 transition-colors text-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Watchlist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIssueViolation(selectedDetection)}
                    className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold flex items-center justify-center gap-1 cursor-pointer border border-amber-500/30 transition-colors text-xs"
                    title="Generate violation e-Challan"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Challan</span>
                  </button>
                </div>
              </div>
            ) : detections.length > 0 ? (
              <div className="mt-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center text-xs text-neutral-400">
                Click any detected vehicle above to view its full RTO registration, speed radar telemetry, and violation intelligence.
              </div>
            ) : null}
          </div>

        </div>
      </div>

      {/* Auto-Registered Vehicles Database Drawer Modal */}
      {showDbDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">TMC Auto-Registered Vehicle Database</h3>
                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  {autoRegisteredList.length} Vehicles Persisted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDbDrawer(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {autoRegisteredList.length === 0 ? (
                <div className="py-12 text-center text-neutral-500">
                  <Car className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-sm">No auto-registered vehicles yet</p>
                  <p className="text-xs text-neutral-600 mt-1">Vehicles detected in video clips or live cameras automatically save here.</p>
                </div>
              ) : (
                autoRegisteredList.map((veh, idx) => (
                  <div key={veh.id || idx} className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30">
                          {veh.plate}
                        </span>
                        <span className="text-xs text-neutral-300 font-semibold">{veh.color} {veh.type}</span>
                        <span className="text-xs text-neutral-500">•</span>
                        <span className="text-xs text-neutral-400">{veh.registeredState || 'Registered'}</span>
                      </div>
                      <div className="text-xs text-neutral-400 flex items-center gap-3">
                        <span>Sightings: <b className="text-white">{veh.sightingsCount}</b></span>
                        <span>•</span>
                        <span>First Seen: {new Date(veh.firstSeen).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>Owner: {veh.registeredOwner || 'RTO Lookup Pending'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDbDrawer(false);
                          onNavigate('tracking', { plate: veh.plate });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Track</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingVehicle({
                          plate: veh.plate,
                          newPlate: veh.plate,
                          owner: veh.registeredOwner || '',
                          state: veh.registeredState || '',
                          type: veh.type
                        })}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-neutral-800 cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Plate / Details Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base">Edit License Plate & Vehicle Record</h3>
              <button 
                type="button" 
                onClick={() => setEditingVehicle(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">License Plate Number:</label>
                <input
                  type="text"
                  value={editingVehicle.newPlate}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, newPlate: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">Registered Owner / Department:</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe / Commercial Logistics"
                  value={editingVehicle.owner}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, owner: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">Region / Plate Standard:</label>
                <input
                  type="text"
                  placeholder="e.g. California / EU Standard / Karnataka"
                  value={editingVehicle.state}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlateEdit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold cursor-pointer"
              >
                Save & Sync Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 360° RTO Vehicle Intelligence & Violations Dossier Modal */}
      <VehicleDossierModal
        plate={dossierPlate || ''}
        isOpen={!!dossierPlate}
        onClose={() => setDossierPlate(null)}
        onNavigate={onNavigate}
      />
    </div>
  );
};

