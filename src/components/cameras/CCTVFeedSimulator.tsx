import React, { useEffect, useRef, useState } from 'react';
import { Camera, Detection } from '../../types';
import { Video, VideoOff, Wrench, ShieldAlert, Radio, Maximize2, RefreshCw } from 'lucide-react';

interface CCTVFeedSimulatorProps {
  camera: Camera;
  targetDetection?: Detection | null;
  height?: string;
  showDetails?: boolean;
  interactive?: boolean;
}

export const CCTVFeedSimulator: React.FC<CCTVFeedSimulatorProps> = ({
  camera,
  targetDetection,
  height = '320px',
  showDetails = true,
  interactive = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showHUD, setShowHUD] = useState<boolean>(true);
  const [showBBoxes, setShowBBoxes] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Time ticker
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0] + '.' + String(Math.floor(now.getMilliseconds() / 100)).padStart(2, '0'));
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, []);

  // Canvas Traffic Animation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let tick = 0;

    // Simulated traffic objects in frame
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

      // Clear
      ctx.fillStyle = '#080a0f';
      ctx.fillRect(0, 0, w, h);

      if (camera.status === 'OFFLINE') {
        // Render Offline noise
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
        // Calibration bars
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

      // Lane dividers (animated perspective)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 16]);
      ctx.lineDashOffset = -tick * 2;

      // Center divider
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();

      // Lane 1 divider
      ctx.beginPath();
      ctx.moveTo(w * 0.35, 0);
      ctx.lineTo(w * 0.25, h);
      ctx.stroke();

      // Lane 2 divider
      ctx.beginPath();
      ctx.moveTo(w * 0.65, 0);
      ctx.lineTo(w * 0.75, h);
      ctx.stroke();

      ctx.setLineDash([]); // Reset line dash

      // Zebra crossing / Stop Line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let z = 0; z < 8; z++) {
        ctx.fillRect(w * 0.15 + z * (w * 0.7 / 8) + 5, h * 0.82, 18, 6);
      }

      // Render Moving Traffic Vehicles
      vehiclesInScene.forEach((veh, idx) => {
        // Subtle perspective movement
        const animOffset = Math.sin((tick * 0.03) + idx) * 4;
        const vx = veh.x + (idx === 0 ? 0 : Math.sin(tick * 0.02 + idx) * 8);
        const vy = veh.y + animOffset;

        // Vehicle shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(vx - 2, vy + veh.h - 4, veh.w + 4, 8);

        // Vehicle body
        ctx.fillStyle = veh.color;
        ctx.beginPath();
        ctx.roundRect(vx, vy, veh.w, veh.h, 4);
        ctx.fill();

        // Windshield
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(vx + veh.w * 0.2, vy + 4, veh.w * 0.6, veh.h * 0.35);

        // Headlights / taillights
        ctx.fillStyle = '#fde047';
        ctx.fillRect(vx + 4, vy + 2, 8, 4);
        ctx.fillRect(vx + veh.w - 12, vy + 2, 8, 4);

        // Bounding Boxes Overlay (ANPR AI Engine Visualizer)
        if (showBBoxes) {
          const isTarget = idx === 0 || veh.plate === targetDetection?.plate;
          const boxColor = isTarget ? '#10b981' : '#06b6d4';

          // Vehicle Bounding Box
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = isTarget ? 2 : 1.5;
          ctx.strokeRect(vx - 6, vy - 6, veh.w + 12, veh.h + 12);

          // Corner markers for military/police HUD feel
          const cs = 6;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          // Top Left
          ctx.beginPath();
          ctx.moveTo(vx - 6, vy - 6 + cs);
          ctx.lineTo(vx - 6, vy - 6);
          ctx.lineTo(vx - 6 + cs, vy - 6);
          ctx.stroke();
          // Bottom Right
          ctx.beginPath();
          ctx.moveTo(vx + veh.w + 6 - cs, vy + veh.h + 6);
          ctx.lineTo(vx + veh.w + 6, vy + veh.h + 6);
          ctx.lineTo(vx + veh.w + 6, vy + veh.h + 6 - cs);
          ctx.stroke();

          // Vehicle Class & Confidence Tag
          ctx.fillStyle = isTarget ? 'rgba(16, 185, 129, 0.95)' : 'rgba(6, 182, 212, 0.9)';
          ctx.fillRect(vx - 6, vy - 24, 110, 16);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${veh.type} | ${(96 + idx * 0.8).toFixed(1)}%`, vx - 2, vy - 12);

          // License Plate Bounding Box
          const px = vx + veh.w * 0.2;
          const py = vy + veh.h * 0.65;
          const pw = veh.w * 0.6;
          const ph = 14;

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px, py, pw, ph);

          // Plate OCR text bubble
          ctx.fillStyle = 'rgba(10, 13, 20, 0.95)';
          ctx.fillRect(px, py + ph + 2, pw, 14);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(veh.plate, px + pw / 2, py + ph + 12);
        }
      });

      // Subtle Scanline & Noise
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let s = 0; s < h; s += 4) {
        ctx.fillRect(0, s, w, 1);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [camera, targetDetection, showBBoxes]);

  return (
    <div 
      className="relative rounded-xl overflow-hidden border border-[#1d2638] bg-[#080a0f] select-none group shadow-inner"
      style={{ height }}
    >
      {/* Canvas */}
      <canvas 
        ref={canvasRef} 
        width={640} 
        height={360} 
        className="w-full h-full object-cover block"
      />

      {/* CCTV HUD Scanline Layer */}
      <div className="absolute inset-0 cctv-scanline pointer-events-none" />

      {/* CCTV HUD Header Overlay */}
      {showHUD && (
        <>
          <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-xs font-mono z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-[#090c13]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1f293d] shadow-md">
              <span className={`w-2 h-2 rounded-full ${camera.status === 'ONLINE' || (camera.status as string) === 'LIVE' ? 'bg-emerald-400 ring-2 ring-emerald-400/30 animate-pulse' : camera.status === 'OFFLINE' ? 'bg-red-500' : 'bg-amber-400'}`} />
              <span className="font-bold text-white">{camera.code}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 truncate max-w-[140px] sm:max-w-xs">{camera.name}</span>
            </div>

            <div className="flex items-center gap-2 bg-[#090c13]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1f293d] shadow-md">
              <span className="text-emerald-400 font-bold">● LIVE</span>
              <span className="text-slate-400">{currentTime || '10:42:18'}</span>
            </div>
          </div>

          {/* CCTV HUD Footer Overlay */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono z-10 pointer-events-none">
            <div className="bg-[#090c13]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1f293d] text-slate-300 shadow-md">
              <span className="text-cyan-400 font-semibold">EDGE-AI: </span>
              <span>{camera.cameraType}</span>
              <span className="text-slate-500 ml-2">[{camera.lat.toFixed(4)}°N, {camera.lng.toFixed(4)}°E]</span>
            </div>

            <div className="bg-[#090c13]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1f293d] flex items-center gap-2 shadow-md">
              <span className="text-amber-400 font-semibold">LAST OCR:</span>
              <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-500/30">
                {targetDetection?.plate || camera.lastDetectedPlate || 'KA01AB1234'}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Operator Floating Controls */}
      {interactive && (
        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-[#0e131d]/90 p-1.5 rounded-lg border border-[#1f293d] z-20 shadow-lg">
          <button 
            type="button"
            onClick={() => setShowBBoxes(!showBBoxes)}
            className={`p-1.5 rounded-md text-xs transition-colors ${showBBoxes ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Toggle AI Bounding Boxes"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => setShowHUD(!showHUD)}
            className={`p-1.5 rounded-md text-xs transition-colors ${showHUD ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Toggle Camera HUD"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
