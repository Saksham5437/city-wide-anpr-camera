import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Video, Play, Pause, RotateCcw, FastForward, Rewind, 
  Camera, ShieldAlert, AlertTriangle, CheckCircle2, Sliders, 
  Cpu, Eye, EyeOff, Radio, Download, ExternalLink, RefreshCw, 
  Car, Gauge, Sparkles, X, ChevronRight, Bell, FileText, Search
} from 'lucide-react';
import { 
  VideoDetection, VehicleClass, ViolationType, Camera as CameraType 
} from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { 
  videoAnprEngine, VideoAnprConfig, TrackedVehicleObject 
} from '../../services/videoAnprEngine';
import { NavTab } from '../layout/Sidebar';

interface VideoAnprStudioProps {
  onNavigate: (tab: NavTab, meta?: any) => void;
  initialCamera?: CameraType | null;
}

export const VideoAnprStudio: React.FC<VideoAnprStudioProps> = ({
  onNavigate,
  initialCamera
}) => {
  const isDark = trafficStore.getTheme() === 'dark';

  // Video element & canvas overlay refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Video source state
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
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

  // HUD & Engine configuration
  const [config, setConfig] = useState<VideoAnprConfig>({
    speedLimitKmh: 80,
    sensitivity: 7,
    enableRadar: true,
    enablePlates: true,
    enableTripwire: true,
    virtualSignalColor: 'green',
    tripwireYPercent: 68
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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
      videoAnprEngine.reset();
      setDetections([]);
      setSelectedDetection(null);

      const result = await videoAnprEngine.generateSampleTrafficVideo(preset);
      setVideoSrc(result.blobUrl);
      setVideoName(`preset-${preset}-traffic.webm`);
      setIsGeneratingPreset(false);
      showToast(`Loaded ${preset.toUpperCase()} synthetic traffic video stream.`);
    } catch (err) {
      setIsGeneratingPreset(false);
      console.error('Failed to generate sample video:', err);
    }
  };

  // Handle Custom Video Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      setWebcamStream(null);
      setIsWebcamActive(false);
    }

    const url = URL.createObjectURL(file);
    videoAnprEngine.reset();
    setDetections([]);
    setSelectedDetection(null);
    setVideoSrc(url);
    setVideoName(file.name);
    showToast(`Loaded video: ${file.name}`);
  };

  // Handle Drag and Drop Upload
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        setWebcamStream(null);
        setIsWebcamActive(false);
      }
      const url = URL.createObjectURL(file);
      videoAnprEngine.reset();
      setDetections([]);
      setSelectedDetection(null);
      setVideoSrc(url);
      setVideoName(file.name);
      showToast(`Loaded video: ${file.name}`);
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
        showToast('Live Webcam input initialized for ANPR detection.');
      } catch (err) {
        console.error('Webcam access error:', err);
        showToast('Could not access webcam. Check permissions.');
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

  // Sync Video Duration and Time
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

  // Video Frame Analysis & HUD Render Loop
  const renderFrameLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;

    if (video && canvas && video.readyState >= 1) {
      // Set canvas display size to match video bounding client rect
      if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
        canvas.width = video.clientWidth || 640;
        canvas.height = video.clientHeight || 360;
      }

      // Run computer vision frame analyzer
      const analysis = videoAnprEngine.processFrame(video, config);
      setTrackedVehicles(analysis.trackedVehicles);
      setTripwireCrossings(analysis.currentTripwireCrossings);

      // Append new detections if found
      if (analysis.newDetections.length > 0) {
        setDetections(prev => {
          const combined = [...analysis.newDetections, ...prev];
          return combined.slice(0, 50); // Keep latest 50
        });

        // Automatically push any watchlisted vehicle to global trafficStore
        analysis.newDetections.forEach(det => {
          if (det.isWatchlisted) {
            trafficStore.recordVideoDetection(det, initialCamera?.code || 'CAM-V01', initialCamera?.name || 'Uploaded Video Stream');
          }
        });
      }

      // Render HUD Overlays on Canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // 1. Draw Tripwire Stop Line
        if (overlayLayers.tripwire && config.enableTripwire) {
          const tripY = (config.tripwireYPercent / 100) * h;
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = config.virtualSignalColor === 'red' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.8)';
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(10, tripY);
          ctx.lineTo(w - 10, tripY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Line Label
          ctx.fillStyle = config.virtualSignalColor === 'red' ? '#ef4444' : '#10b981';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.fillText(
            `VIRTUAL STOP-LINE [SIGNAL: ${config.virtualSignalColor.toUpperCase()}]`, 
            16, 
            tripY - 6
          );
        }

        // 2. Draw Tracked Vehicles Overlays
        analysis.trackedVehicles.forEach(veh => {
          const vx = (veh.bbox[0] / 100) * w;
          const vy = (veh.bbox[1] / 100) * h;
          const vw = (veh.bbox[2] / 100) * w;
          const vh = (veh.bbox[3] / 100) * h;

          // Speed violation strictly above 80 km/h
          const isOverspeed = config.enableRadar && veh.speed > Math.max(80, config.speedLimitKmh);
          const isWatch = veh.isWatchlisted;

          // Box color
          let boxColor = '#10b981'; // Emerald
          if (isWatch) boxColor = '#ef4444'; // Red for watchlist
          else if (isOverspeed) boxColor = '#f43f5e'; // Bright Rose/Red for overspeed > 80 km/h

          // Vehicle Box & Corner Brackets
          if (overlayLayers.vehicleBoxes) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = boxColor;
            ctx.strokeRect(vx, vy, vw, vh);

            // Tech Corner Reticles
            const bLen = Math.min(14, vw * 0.25);
            ctx.lineWidth = 3.5;
            // Top-left
            ctx.beginPath();
            ctx.moveTo(vx, vy + bLen); ctx.lineTo(vx, vy); ctx.lineTo(vx + bLen, vy);
            ctx.stroke();
            // Top-right
            ctx.beginPath();
            ctx.moveTo(vx + vw - bLen, vy); ctx.lineTo(vx + vw, vy); ctx.lineTo(vx + vw, vy + bLen);
            ctx.stroke();
            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(vx, vy + vh - bLen); ctx.lineTo(vx, vy + vh); ctx.lineTo(vx + bLen, vy + vh);
            ctx.stroke();
            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(vx + vw - bLen, vy + vh); ctx.lineTo(vx + vw, vy + vh); ctx.lineTo(vx + vw, vy + vh - bLen);
            ctx.stroke();

            // Vehicle Category Tag
            ctx.fillStyle = boxColor;
            ctx.fillRect(vx, vy - 18, Math.max(90, vw * 0.7), 18);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
            ctx.fillText(`${veh.type.toUpperCase()} • ${veh.confidence}%`, vx + 4, vy - 5);
          }

          // License Plate HUD Box
          if (overlayLayers.plateHUD && config.enablePlates) {
            const px = (veh.plateBbox[0] / 100) * w;
            const py = (veh.plateBbox[1] / 100) * h;
            const pw = (veh.plateBbox[2] / 100) * w;
            const ph = (veh.plateBbox[3] / 100) * h;

            // Plate Box
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fef08a';
            ctx.strokeRect(px, py, pw, ph);

            // Floating Plate Banner
            const bannerW = 120;
            const bannerH = 22;
            const bannerX = Math.max(4, Math.min(w - bannerW - 4, px + pw / 2 - bannerW / 2));
            const bannerY = Math.min(h - 26, py + ph + 4);

            ctx.fillStyle = isWatch ? 'rgba(239, 68, 68, 0.95)' : 'rgba(15, 23, 42, 0.9)';
            ctx.beginPath();
            ctx.roundRect(bannerX, bannerY, bannerW, bannerH, [4]);
            ctx.fill();
            ctx.strokeStyle = isWatch ? '#fca5a5' : '#fef08a';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Plate Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(veh.plate, bannerX + bannerW / 2, bannerY + 15);
            ctx.textAlign = 'left';
          }

          // Speed Radar Telemetry
          if (overlayLayers.speedRadar && config.enableRadar) {
            const tagX = vx + vw + 6;
            const tagY = vy + 16;
            if (tagX + 85 < w) {
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
              const hx = (pt.x / 100) * w;
              const hy = (pt.y / 100) * h;
              if (idx === 0) ctx.moveTo(hx, hy);
              else ctx.lineTo(hx, hy);
            });
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }
    }

    animationFrameRef.current = requestAnimationFrame(renderFrameLoop);
  }, [config, overlayLayers, initialCamera]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(renderFrameLoop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderFrameLoop]);

  // Capture Snapshot of current frame
  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    const dataUrl = videoAnprEngine.cropVehicleSnapshot(video, [20, 20, 60, 60]);
    const link = document.createElement('a');
    link.download = `anpr-snapshot-${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();
    showToast('Snapshot captured and downloaded.');
  };

  // Push single detection to live system
  const handlePushToSystem = (det: VideoDetection) => {
    trafficStore.recordVideoDetection(det, initialCamera?.code || 'CAM-V01', initialCamera?.name || 'Uploaded Video Stream');
    setDetections(prev => prev.map(d => d.id === det.id ? { ...d, pushedToSystem: true } : d));
    showToast(`Pushed vehicle ${det.plate} to Live System!`);
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
      notes: `Optical violation verified in uploaded video at timestamp ${det.formattedTime}.`
    });
    setDetections(prev => prev.map(d => d.id === det.id ? { ...d, pushedToSystem: true } : d));
    showToast(`Issued e-Challan for vehicle ${det.plate}! Check Violations tab.`);
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
    showToast(`Added ${plate} to City Watchlist!`);
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
      await new Promise(r => setTimeout(r, 60)); // Wait for frame seek
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
    showToast(`Fast Video Scan complete! Extracted ${foundDetections.length} ANPR detections.`);
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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-emerald-500 text-slate-950 font-semibold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
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
              <div className="flex items-center gap-2">
                <h1 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>
                  Video ANPR & AI Detection Studio
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  REAL-TIME OPTICAL OCR
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${textMuted}`}>
                Upload traffic CCTV footage or select pre-recorded video clips. Real-time license plate detection, vehicle classification, speed radar, and automatic e-Challan generation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Header */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="video/*" 
            className="hidden" 
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video File</span>
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
            <span>{isWebcamActive ? 'Stop Webcam' : 'Use Live Camera'}</span>
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

      {/* Main Studio Grid: Left 8 Cols (Video + HUD + Scrubber), Right 4 Cols (Detection Feed & Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Video Viewport & Playback Bar (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Video Container Box */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`relative rounded-2xl overflow-hidden border ${dividerBorder} bg-black shadow-2xl group select-none`}
            style={{ minHeight: '440px' }}
          >
            {/* HTML5 Video Element */}
            {videoSrc && (
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

            {/* Top Live Video Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-neutral-950/80 text-emerald-400 border border-neutral-700/80 backdrop-blur-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {isWebcamActive ? 'LIVE WEBCAM STREAM' : videoName.toUpperCase()}
                </span>
                <span className="px-2 py-1 rounded-md text-xs font-mono bg-neutral-950/80 text-neutral-300 border border-neutral-700/80 backdrop-blur-md">
                  {trackedVehicles.length} Target{trackedVehicles.length === 1 ? '' : 's'} in Frame
                </span>
              </div>

              {/* Virtual Traffic Light Indicator */}
              <div className="flex items-center gap-2 pointer-events-auto">
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

            {/* Bottom Floating Scrubber HUD Overlay (on hover) */}
            <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-neutral-950/85 border border-neutral-800/80 backdrop-blur-md flex flex-col gap-2 z-20 transition-opacity">
              
              {/* Timeline Slider with Detection Pin Markers */}
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
              <div className="flex items-center justify-between gap-2 pt-1 text-xs">
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
                  {/* Speed Selector */}
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

                  {/* Snapshot Button */}
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
            </div>
          </div>

          {/* Overlays & Calibration Toolbar */}
          <div className={`${cardBg} border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs`}>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${textTitle} flex items-center gap-1.5`}>
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Visual HUD Layers:</span>
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
              <div className="text-xs text-neutral-400">Watchlist Hits</div>
              <div className="text-xl font-mono font-bold text-red-400 mt-1">
                {detections.filter(d => d.isWatchlisted).length}
              </div>
            </div>
            <div className={`${cardBg} border rounded-xl p-3`}>
              <div className="text-xs text-neutral-400">Violations Flagged</div>
              <div className="text-xl font-mono font-bold text-amber-400 mt-1">
                {detections.filter(d => d.violation).length}
              </div>
            </div>
            <div className={`${cardBg} border rounded-xl p-3`}>
              <div className="text-xs text-neutral-400">Highest Speed</div>
              <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
                {detections.reduce((max, d) => Math.max(max, d.speed), 0)} km/h
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
                  <p className="text-[11px] mt-1 text-neutral-600">Play the video or upload a video file to start ANPR recognition.</p>
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
                        {/* Plate & Watchlist Badge */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30">
                            {det.plate}
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
                      <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
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
                        <span>Jump to Frame</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePushToSystem(det);
                          }}
                          disabled={det.pushedToSystem}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                            det.pushedToSystem 
                              ? 'bg-neutral-800 text-neutral-500 cursor-default' 
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer'
                          }`}
                        >
                          {det.pushedToSystem ? 'Logged' : 'Push to Live'}
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

            {/* Selected Detection Detail Drawer at bottom of column */}
            {selectedDetection && (
              <div className="mt-3 p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>Selected Target: {selectedDetection.plate}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedDetection(null)}
                    className="text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-neutral-300">
                  <div>Confidence: <span className="font-mono text-emerald-400">{selectedDetection.confidence}%</span></div>
                  <div>Lane: <span className="font-mono text-cyan-400">Lane #{selectedDetection.laneNumber}</span></div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigate('tracking', { plate: selectedDetection.plate })}
                    className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>Track Vehicle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddToWatchlist(selectedDetection.plate, selectedDetection.vehicleType)}
                    className="flex-1 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>Watchlist</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
