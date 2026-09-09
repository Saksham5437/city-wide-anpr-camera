import React, { useState } from 'react';
import { Settings, Cpu, Shield, Database, Radio, CheckCircle2, Save, RefreshCw } from 'lucide-react';
import { trafficStore } from '../../services/trafficStore';

export const SettingsPage: React.FC = () => {
  const [yoloThreshold, setYoloThreshold] = useState<number>(85);
  const [ocrThreshold, setOcrThreshold] = useState<number>(90);
  const [reIdWeight, setReIdWeight] = useState<number>(80);
  const [speedTolerance, setSpeedTolerance] = useState<number>(3);
  const [autoChallan, setAutoChallan] = useState<boolean>(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState<number>(3000);
  const [saved, setSaved] = useState<boolean>(false);

  const isDark = trafficStore.getTheme() === 'dark';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const innerBg = isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className={`pb-4 border-b ${dividerBorder}`}>
        <h2 className={`text-xl font-extrabold tracking-tight font-sans ${textTitle}`}>
          System Configuration & AI Engine Parameters
        </h2>
        <p className={`text-xs mt-1 font-sans ${textMuted}`}>
          Fine-tune YOLO neural networks, optical character recognition thresholds, and TMC communication pipeline.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: AI Edge Model Parameters */}
        <div className={`${cardBg} border rounded-2xl p-5 space-y-4`}>
          <div className={`flex items-center gap-2 pb-3 border-b ${dividerBorder}`}>
            <Cpu className="w-4 h-4 text-emerald-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>
              AI Computer Vision & OCR Sensitivity
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={textMuted}>YOLO Detection Threshold:</span>
                <span className="font-bold text-amber-500">{yoloThreshold}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={99}
                value={yoloThreshold}
                onChange={(e) => setYoloThreshold(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-neutral-700 bg-neutral-800"
              />
              <p className={`text-[11px] font-sans ${textMuted}`}>Minimum confidence required to classify vehicle bounding box.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={textMuted}>Plate OCR Character Confidence:</span>
                <span className="font-bold text-amber-500">{ocrThreshold}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={99}
                value={ocrThreshold}
                onChange={(e) => setOcrThreshold(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-neutral-700 bg-neutral-800"
              />
              <p className={`text-[11px] font-sans ${textMuted}`}>Threshold for optical recognition before flagging for manual review.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={textMuted}>Cross-Camera Re-ID Weight:</span>
                <span className="font-bold text-emerald-500">{reIdWeight}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={95}
                value={reIdWeight}
                onChange={(e) => setReIdWeight(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-neutral-700 bg-neutral-800"
              />
              <p className={`text-[11px] font-sans ${textMuted}`}>Weight assigned to vehicle color and body profile visual embeddings.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={textMuted}>Doppler Speed Tolerance:</span>
                <span className={`font-bold ${textTitle}`}>± {speedTolerance} km/h</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={speedTolerance}
                onChange={(e) => setSpeedTolerance(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-neutral-700 bg-neutral-800"
              />
              <p className={`text-[11px] font-sans ${textMuted}`}>Legal calibration margin before logging speed violation notice.</p>
            </div>
          </div>
        </div>

        {/* Section 2: TMC System & Enforcement Policies */}
        <div className={`${cardBg} border rounded-2xl p-5 space-y-4`}>
          <div className={`flex items-center gap-2 pb-3 border-b ${dividerBorder}`}>
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>
              Enforcement & Automation Rules
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer ${innerBg}`}>
              <div>
                <span className={`font-bold block font-sans ${textTitle}`}>Automatic High-Speed Red Light E-Challan Issuance</span>
                <span className={`text-[11px] font-sans ${textMuted}`}>Instantly flag and queue certified optical violations with &gt;95% confidence</span>
              </div>
              <input
                type="checkbox"
                checked={autoChallan}
                onChange={(e) => setAutoChallan(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
              />
            </label>

            <div className={`p-3.5 rounded-2xl border flex items-center justify-between font-mono ${innerBg}`}>
              <div>
                <span className={`font-bold block font-sans ${textTitle}`}>Camera RTSP Heartbeat Polling Rate</span>
                <span className={`text-[11px] font-sans ${textMuted}`}>Ping interval for 50+ camera streams across Bangalore City</span>
              </div>
              <span className="text-emerald-500 font-bold">{heartbeatInterval} ms</span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <div className="text-xs font-mono text-emerald-500 flex items-center gap-1.5 animate-in fade-in font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuration successfully committed to BTP TMC cluster!</span>
            </div>
          ) : (
            <div className={`text-xs font-mono ${textMuted}`}>
              Role: Administrator (Write Access Authorized)
            </div>
          )}

          <button
            type="submit"
            className={`px-6 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow border ${
              isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Apply System Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
