import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Detection, VideoDetection } from '../../types';
import { 
  Video, VideoOff, Wrench, ShieldAlert, Radio, Upload, 
  Play, Pause, X, RotateCcw, Camera as CameraIcon, Film, Sparkles 
} from 'lucide-react';
import { videoAnprEngine, TrackedVehicleObject, VideoAnprConfig } from '../../services/videoAnprEngine';
import { trafficStore } from '../../services/trafficStore';

interface CCTVFeedSimulatorProps {
  camera: Camera;
  targetDetection?: Detection | null;
  height?: string;
  showDetails?: boolean;
  interactive?: boolean;
  onActiveDetection?: (detection: VideoDetection) => void;
  allowVideoUpload?: boolean;
}

export const CCTVFeedSimulator: React.FC<CCTVFeedSimulatorProps> = ({
  camera,
  targetDetection,
  height = '320px',
  showDetails = true,
  interactive = true,
  onActiveDetection,
  allowVideoUpload = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [showHUD, setShowHUD] = useState<boolean>(true);
  const [showBBoxes, setShowBBoxes] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Video Upload State
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(camera.streamUrl || null);
  const [videoFileName, setVideoFileName] = useState<string | null>(camera.streamUrl ? 'Custom Video Stream' : null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [videoTime, setVideoTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isLoadingPreset, setIsLoadingPreset] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [detectedVehiclesCount, setDetectedVehiclesCount] = useState<number>(0);

  // Time ticker
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toTimeString().split(' ')[0] + '.' + 
        String(Math.floor(now.getMilliseconds() / 100)).padStart(2, '0')
      );
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, []);

  // Handle Video File Upload to this CCTV port
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    videoAnprEngine.reset();
    setUploadedVideoUrl(url);
    setVideoFileName(file.name);
    setIsVideoPlaying(true);
  };

  // Drag and drop video directly onto this CCTV port
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      videoAnprEngine.reset();
      setUploadedVideoUrl(url);
      setVideoFileName(file.name);
      setIsVideoPlaying(true);
    }
  };

  // Load a fast sample clip into this CCTV port
  const loadPresetIntoPort = async (preset: 'highway' | 'junction' | 'night') => {
    try {
      setIsLoadingPreset(true);
      videoAnprEngine.reset();
      const res = await videoAnprEngine.generateSampleTrafficVideo(preset);
      setUploadedVideoUrl(res.blobUrl);
      setVideoFileName(`Port-${camera.code}-${preset}.webm`);
      setIsLoadingPreset(false);
      setIsVideoPlaying(true);
    } catch (err) {
      setIsLoadingPreset(false);
      console.error('Error generating preset:', err);
    }
  };

  const clearUploadedVideo = () => {
    setUploadedVideoUrl(null);
    setVideoFileName(null);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsVideoPlaying(true);
    } else {
      video.pause();
      setIsVideoPlaying(false);
    }
  };

  // Video Frame Loop with Computer Vision Detection
  const renderVideoDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = videoOverlayCanvasRef.current;

    if (video && canvas && video.readyState >= 1) {
      if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
        canvas.width = video.clientWidth || 640;
        canvas.height = video.clientHeight || 360;
      }

      const anprConfig: VideoAnprConfig = {
        speedLimitKmh: 80,
        sensitivity: 7,
        enableRadar: true,
        enablePlates: true,
        enableTripwire: true,
        virtualSignalColor: 'green',
        tripwireYPercent: 70
      };

      const analysis = videoAnprEngine.processFrame(video, anprConfig);
      setDetectedVehiclesCount(analysis.trackedVehicles.length);

      // When detections occur on this CCTV port, record in global trafficStore
      if (analysis.newDetections.length > 0) {
        analysis.newDetections.forEach(det => {
          trafficStore.recordVideoDetection(det, camera.code, camera.name, camera.location);
          camera.lastDetectedPlate = det.plate;
          camera.vehiclesToday += 1;
          if (onActiveDetection) {
            onActiveDetection(det);
          }
        });
      }

      // Draw bounding boxes on the CCTV port overlay
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        analysis.trackedVehicles.forEach(veh => {
          const vx = (veh.bbox[0] / 100) * w;
          const vy = (veh.bbox[1] / 100) * h;
          const vw = (veh.bbox[2] / 100) * w;
          const vh = (veh.bbox[3] / 100) * h;

          // STRICT SPEEDING RULE: Only trigger when speed is above 80 km/h
          const isOverspeed = veh.speed > 80;
          const isWatch = veh.isWatchlisted;
          const boxColor = isWatch ? '#ef4444' : isOverspeed ? '#f43f5e' : '#10b981';

          if (showBBoxes) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = boxColor;
            ctx.strokeRect(vx, vy, vw, vh);

            // Tech reticle corners
            const cs = Math.min(8, vw * 0.2);
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(vx, vy + cs); ctx.lineTo(vx, vy); ctx.lineTo(vx + cs, vy);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(vx + vw - cs, vy); ctx.lineTo(vx + vw, vy); ctx.lineTo(vx + vw, vy + cs);
            ctx.stroke();

            // Vehicle Category Tag
            ctx.fillStyle = boxColor;
            ctx.fillRect(vx, vy - 16, Math.max(75, vw * 0.65), 16);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
            ctx.fillText(`${veh.type} | ${veh.confidence}%`, vx + 3, vy - 4);

            // License Plate Box & OCR Banner
            const px = (veh.plateBbox[0] / 100) * w;
            const py = (veh.plateBbox[1] / 100) * h;
            const pw = (veh.plateBbox[2] / 100) * w;
            const ph = (veh.plateBbox[3] / 100) * h;

            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#fef08a';
            ctx.strokeRect(px, py, pw, ph);

            // Floating Plate Tag
            const bannerW = 95;
            const bannerH = 16;
            const bannerX = Math.max(2, Math.min(w - bannerW - 2, px + pw / 2 - bannerW / 2));
            const bannerY = Math.min(h - 20, py + ph + 2);

            ctx.fillStyle = isWatch ? 'rgba(239, 68, 68, 0.95)' : 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(veh.plate, bannerX + bannerW / 2, bannerY + 12);
            ctx.textAlign = 'left';

            // Speed Radar Tag - Only flags speeding when strictly > 80 km/h
            const sx = vx + vw + 4;
            const sy = vy + 12;
            if (sx + 60 < w) {
              const tagW = isOverspeed ? 92 : 56;
              ctx.fillStyle = isOverspeed ? '#ef4444' : '#0284c7';
              ctx.fillRect(sx, sy - 12, tagW, 14);
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 9px "JetBrains Mono", monospace';
              ctx.fillText(isOverspeed ? `⚡ ${veh.speed} km/h (>80)` : `${veh.speed} km/h`, sx + 3, sy - 2);
            }
          }
        });
      }
    }

    animationFrameRef.current = requestAnimationFrame(renderVideoDetectionLoop);
  }, [camera, showBBoxes, onActiveDetection]);

  useEffect(() => {
    if (uploadedVideoUrl) {
      animationFrameRef.current = requestAnimationFrame(renderVideoDetectionLoop);
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [uploadedVideoUrl, renderVideoDetectionLoop]);

  // Fallback / Default Canvas Traffic Animation Engine
  useEffect(() => {
    if (uploadedVideoUrl) return; // Skip canvas animation if real video is loaded

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let tick = 0;

    const vehiclesInScene = [
      { x: 120, y: 140, w: 90, h: 55, speed: 1.2, color: '#f8fafc', type: 'Car', plate: targetDetection?.plate || camera.lastDetectedPlate || 'KA01AB1234' },
      { x: 260, y: 170, w: 120, h: 65, speed: 1.6, color: '#0284c7', type: 'SUV', plate: 'KA03MN4521' },
      { x: 420, y: 120, w: 70, h: 40, speed: 0.9, color: '#e11d48', type: 'Car', plate: 'KA05XY7812' },
      { x: 50, y: 200, w: 45, h: 30, speed: 1.8, color: '#d97706', type: 'Bike', plate: 'KA04MN9012' }
    ];

    const render = () => {
      tick++;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#080a0f';
      ctx.fillRect(0, 0, w, h);

      if (camera.status === 'OFFLINE') {
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 400; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#161c28' : '#222d42';
          ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('● SIGNAL LOST — RTSP STREAM TIMEOUT', w / 2, h / 2 - 10);
        ctx.fillStyle = '#64748b';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText(`DEVICE: ${camera.code} | IP: ${camera.ipAddress}`, w / 2, h / 2 + 15);
        return;
      }

      if (camera.status === 'MAINTENANCE') {
        const colors = ['#ffffff', '#fbbf24', '#38bdf8', '#4ade80', '#c084fc', '#f43f5e', '#1e293b'];
        const barWidth = w / colors.length;
        colors.forEach((col, idx) => {
          ctx.fillStyle = col;
          ctx.fillRect(idx * barWidth, 0, barWidth, h * 0.75);
        });
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, h * 0.75, w, h * 0.25);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CALIBRATION / MAINTENANCE MODE', w / 2, h * 0.88);
        return;
      }

      // Draw Road & City Perspective
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#111726');
      grad.addColorStop(0.4, '#1e2738');
      grad.addColorStop(1, '#0f141f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Road asphalt surface
      ctx.fillStyle = '#11151e';
      ctx.beginPath();
      ctx.moveTo(w * 0.2, 0);
      ctx.lineTo(w * 0.8, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Lane dividers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 16]);
      ctx.lineDashOffset = -tick * 2;

      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w * 0.35, 0);
      ctx.lineTo(w * 0.25, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w * 0.65, 0);
      ctx.lineTo(w * 0.75, h);
      ctx.stroke();

      ctx.setLineDash([]);

      // Zebra crossing
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let z = 0; z < 8; z++) {
        ctx.fillRect(w * 0.15 + z * (w * 0.7 / 8) + 5, h * 0.82, 18, 6);
      }

      // Render Moving Traffic Vehicles
      vehiclesInScene.forEach((veh, idx) => {
        const animOffset = Math.sin((tick * 0.03) + idx) * 4;
        const vx = veh.x + (idx === 0 ? 0 : Math.sin(tick * 0.02 + idx) * 8);
        const vy = veh.y + animOffset;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(vx - 2, vy + veh.h - 4, veh.w + 4, 8);

        ctx.fillStyle = veh.color;
        ctx.beginPath();
        ctx.roundRect(vx, vy, veh.w, veh.h, 4);
        ctx.fill();

        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(vx + veh.w * 0.2, vy + 4, veh.w * 0.6, veh.h * 0.35);

        ctx.fillStyle = '#fde047';
        ctx.fillRect(vx + 4, vy + 2, 8, 4);
        ctx.fillRect(vx + veh.w - 12, vy + 2, 8, 4);

        if (showBBoxes) {
          const isTarget = idx === 0 || veh.plate === targetDetection?.plate;
          const boxColor = isTarget ? '#10b981' : '#06b6d4';

          ctx.strokeStyle = boxColor;
          ctx.lineWidth = isTarget ? 2 : 1.5;
          ctx.strokeRect(vx - 6, vy - 6, veh.w + 12, veh.h + 12);

          const cs = 6;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(vx - 6, vy - 6 + cs); ctx.lineTo(vx - 6, vy - 6); ctx.lineTo(vx - 6 + cs, vy - 6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(vx + veh.w + 6 - cs, vy + veh.h + 6); ctx.lineTo(vx + veh.w + 6, vy + veh.h + 6); ctx.lineTo(vx + veh.w + 6, vy + veh.h + 6 - cs);
          ctx.stroke();

          ctx.fillStyle = isTarget ? 'rgba(16, 185, 129, 0.95)' : 'rgba(6, 182, 212, 0.9)';
          ctx.fillRect(vx - 6, vy - 24, 110, 16);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${veh.type} | ${(96 + idx * 0.8).toFixed(1)}%`, vx - 2, vy - 12);

          const px = vx + veh.w * 0.2;
          const py = vy + veh.h * 0.65;
          const pw = veh.w * 0.6;
          const ph = 14;

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px, py, pw, ph);

          ctx.fillStyle = 'rgba(10, 13, 20, 0.95)';
          ctx.fillRect(px, py + ph + 2, pw, 14);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(veh.plate, px + pw / 2, py + ph + 12);
        }
      });

      // Scanline & Noise
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let s = 0; s < h; s += 4) {
        ctx.fillRect(0, s, w, 1);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [camera, targetDetection, showBBoxes, uploadedVideoUrl]);

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`relative rounded-xl overflow-hidden border ${isDragOver ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-[#1d2638]'} bg-[#080a0f] select-none group shadow-inner flex items-center justify-center`}
      style={{ height }}
    >
      {/* Hidden File Input for uploading video directly into this CCTV port */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="video/*" 
        className="hidden" 
      />

      {/* Case A: Uploaded Video is Playing in this CCTV Port */}
      {uploadedVideoUrl ? (
        <>
          <video
            ref={videoRef}
            src={uploadedVideoUrl}
            loop
            muted
            autoPlay
            playsInline
            onLoadedMetadata={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            onCanPlay={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            onPlay={() => setIsVideoPlaying(true)}
            onPause={() => setIsVideoPlaying(false)}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setVideoTime(videoRef.current.currentTime);
                setVideoDuration(videoRef.current.duration || 0);
              }
            }}
            className="w-full h-full object-cover block"
          />
          <canvas
            ref={videoOverlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />

          {/* Real-time Detection Status Badge on CCTV port */}
          <div className="absolute top-10 left-3 z-20 flex items-center gap-1.5 pointer-events-none">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/90 text-slate-950 shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
              <span>AI DETECTOR ACTIVE ({detectedVehiclesCount} VEHICLES)</span>
            </span>
          </div>
        </>
      ) : (
        /* Case B: Default Simulated CCTV Stream */
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={360} 
          className="w-full h-full object-cover block"
        />
      )}

      {/* Loading Preset Spinner */}
      {isLoadingPreset && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 z-30">
          <Sparkles className="w-6 h-6 text-emerald-400 animate-spin" />
          <span className="text-xs font-mono text-emerald-400">Loading Test Stream into Port...</span>
        </div>
      )}

      {/* CCTV HUD Scanline Layer */}
      <div className="absolute inset-0 cctv-scanline pointer-events-none" />

      {/* CCTV HUD Header Overlay */}
      {showHUD && (
        <>
          <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-xs font-mono z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-[#090c13]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1f293d] shadow-md">
              <span className={`w-2 h-2 rounded-full ${uploadedVideoUrl ? 'bg-cyan-400 animate-ping' : camera.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              <span className="font-bold text-white">{camera.code}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 truncate max-w-[130px] sm:max-w-xs">
                {uploadedVideoUrl ? (videoFileName || 'Custom Video Feed') : camera.name}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#090c13]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1f293d] shadow-md">
              <span className={`font-bold ${uploadedVideoUrl ? 'text-cyan-400' : 'text-emerald-400'}`}>
                {uploadedVideoUrl ? '● VIDEO ANPR' : '● LIVE'}
              </span>
              <span className="text-slate-400">{currentTime || '10:42:18'}</span>
            </div>
          </div>

          {/* CCTV HUD Footer Overlay */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono z-10 pointer-events-none">
            <div className="bg-[#090c13]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1f293d] text-slate-300 shadow-md flex items-center gap-2">
              <span className="text-cyan-400 font-semibold">PORT: </span>
              <span>{camera.code}</span>
              {uploadedVideoUrl && (
                <span className="text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  REAL-TIME DETECTOR ACTIVE
                </span>
              )}
            </div>

            <div className="bg-[#090c13]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1f293d] flex items-center gap-2 shadow-md">
              <span className="text-amber-400 font-semibold">LAST DETECTED:</span>
              <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-500/30">
                {targetDetection?.plate || camera.lastDetectedPlate || 'KA01AB1234'}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Bottom Transport Bar for Uploaded Video */}
      {uploadedVideoUrl && (
        <div className="absolute bottom-10 left-3 right-3 bg-[#090c13]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#1f293d] flex items-center justify-between gap-3 text-xs font-mono z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
            >
              {isVideoPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <span className="text-neutral-300 text-[11px]">
              {videoAnprEngine.formatTime(videoTime)} / {videoAnprEngine.formatTime(videoDuration)}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearUploadedVideo();
            }}
            className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Revert to Live Feed</span>
          </button>
        </div>
      )}

      {/* Operator CCTV Port Action Toolbar (Hover Controls) */}
      {interactive && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Direct Video Upload into CCTV Port Button */}
          {allowVideoUpload && (
            <>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-2 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md cursor-pointer transition-transform"
                title={`Upload video into ${camera.code} CCTV port`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Video</span>
              </button>

              {/* Sample Preset dropdown/quick button */}
              {!uploadedVideoUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadPresetIntoPort('highway');
                  }}
                  className="px-2 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1 bg-[#151c2a] hover:bg-[#1f2a3e] text-neutral-200 border border-[#2b3952] shadow-md cursor-pointer"
                  title="Test Sample Traffic Video on this Port"
                >
                  <Film className="w-3 h-3 text-cyan-400" />
                  <span>Test Feed</span>
                </button>
              )}
            </>
          )}

          {/* Toggle AI Bounding Boxes */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowBBoxes(!showBBoxes);
            }}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${showBBoxes ? 'bg-cyan-600 text-white' : 'bg-[#0e131d]/90 text-slate-400 hover:text-white border border-[#1f293d]'}`}
            title="Toggle AI Bounding Boxes"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Camera HUD */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowHUD(!showHUD);
            }}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${showHUD ? 'bg-cyan-600 text-white' : 'bg-[#0e131d]/90 text-slate-400 hover:text-white border border-[#1f293d]'}`}
            title="Toggle Camera HUD"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
