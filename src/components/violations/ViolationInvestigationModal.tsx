import React, { useState } from 'react';
import { Violation } from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Printer, 
  Download, 
  ShieldAlert, 
  MapPin, 
  FileText, 
  Camera, 
  User, 
  AlertTriangle,
  QrCode
} from 'lucide-react';

interface ViolationInvestigationModalProps {
  violation: Violation;
  onClose: () => void;
  onNavigateToTracking?: (plate: string) => void;
}

export const ViolationInvestigationModal: React.FC<ViolationInvestigationModalProps> = ({
  violation,
  onClose,
  onNavigateToTracking
}) => {
  const [currentViolation, setCurrentViolation] = useState<Violation>(violation);
  const [operatorNotes, setOperatorNotes] = useState<string>(violation.notes || '');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [showPrintChallan, setShowPrintChallan] = useState<boolean>(false);

  const isDark = trafficStore.getTheme() === 'dark';
  const currentUser = trafficStore.getCurrentUser();

  const handleConfirm = () => {
    trafficStore.updateViolationStatus(
      currentViolation.id,
      'Confirmed',
      operatorNotes || 'Confirmed by optical ANPR evidence review.',
      `${currentUser.name} (Badge #${currentUser.badgeNumber})`
    );
    const updated = trafficStore.getViolationById(currentViolation.id);
    if (updated) setCurrentViolation(updated);
  };

  const handleReject = () => {
    if (!rejectionReason) return;
    trafficStore.updateViolationStatus(
      currentViolation.id,
      'Rejected',
      operatorNotes,
      `${currentUser.name} (Badge #${currentUser.badgeNumber})`,
      rejectionReason
    );
    const updated = trafficStore.getViolationById(currentViolation.id);
    if (updated) setCurrentViolation(updated);
    setShowRejectForm(false);
  };

  const handleMarkReview = () => {
    trafficStore.updateViolationStatus(
      currentViolation.id,
      'Under Review',
      operatorNotes || 'Marked for supervisor escalation.',
      `${currentUser.name} (Badge #${currentUser.badgeNumber})`
    );
    const updated = trafficStore.getViolationById(currentViolation.id);
    if (updated) setCurrentViolation(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  const timeStr = new Date(currentViolation.timestamp).toLocaleTimeString('en-US', { hour12: false });
  const dateStr = new Date(currentViolation.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const modalBg = isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl';
  const innerBg = isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className={`${modalBg} border rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in-50 my-8`}>
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${textMuted}`}>VIOLATION DOCKET:</span>
                <span className={`text-sm font-mono font-bold ${textTitle}`}>{currentViolation.challanNumber}</span>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  currentViolation.status === 'Confirmed' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
                  currentViolation.status === 'Rejected' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                  'bg-amber-500/15 text-amber-500 border-amber-500/30'
                }`}>
                  ● {currentViolation.status.toUpperCase()}
                </span>
              </div>
              <p className={`text-xs mt-0.5 font-sans ${textMuted}`}>
                Bangalore Traffic Police (BTP) Automated Enforcement Record
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors border ${
              isDark ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main 2-Col Grid: Evidence Frame (Left) + Adjudication Details (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: High-Res Optical Evidence Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className={`font-bold uppercase flex items-center gap-1.5 font-sans ${textTitle}`}>
                  <Camera className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Optical Evidence Frame</span>
                </span>
                <span className="text-emerald-500 font-bold">ANPR Lock: {currentViolation.confidence}%</span>
              </div>

              {/* Snapshot with Bounding Box Overlays */}
              <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-black shadow-inner group">
                <img
                  src={currentViolation.evidenceImage || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"}
                  alt="Optical Evidence"
                  className="w-full h-64 object-cover"
                />

                {/* CCTV Scanline */}
                <div className="absolute inset-0 cctv-scanline pointer-events-none" />

                {/* Vehicle Bounding Box Overlay */}
                <div className="absolute inset-4 border-2 border-emerald-500 pointer-events-none">
                  {/* Vehicle Tag */}
                  <div className="bg-emerald-500 text-black font-mono text-[10px] font-bold px-2 py-0.5 inline-block">
                    {currentViolation.vehicleType} | {currentViolation.vehicleColor}
                  </div>
                </div>

                {/* Plate Bounding Box Callout */}
                <div className="absolute bottom-6 left-12 right-12 border-2 border-amber-400 p-1 pointer-events-none flex items-center justify-center bg-black/70 backdrop-blur-xs">
                  <span className="text-amber-400 font-mono font-bold text-sm tracking-widest">
                    {currentViolation.plate}
                  </span>
                </div>

                {/* Camera HUD Metadata Overlay */}
                <div className="absolute top-2.5 left-2.5 bg-black/90 px-2.5 py-1 rounded-xl text-[10px] font-mono text-white border border-neutral-800 pointer-events-none">
                  <div>{currentViolation.cameraCode} | {currentViolation.location}</div>
                  <div className="text-neutral-400">{dateStr} {timeStr} IST</div>
                </div>

                {/* Speed radar tag if speeding */}
                {currentViolation.recordedSpeed && (
                  <div className="absolute top-2.5 right-2.5 bg-red-950/90 text-red-300 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border border-red-500/40 pointer-events-none">
                    RADAR: {currentViolation.recordedSpeed} KM/H (LIMIT {currentViolation.speedLimit})
                  </div>
                )}
              </div>

              <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${innerBg}`}>
                <div className={`flex items-center justify-between ${textMuted}`}>
                  <span>Camera Node:</span>
                  <span className={`font-bold ${textTitle}`}>{currentViolation.cameraCode}</span>
                </div>
                <div className={`flex items-center justify-between ${textMuted}`}>
                  <span>Intersection:</span>
                  <span className={`font-sans ${textTitle}`}>{currentViolation.location}</span>
                </div>
                <div className={`flex items-center justify-between ${textMuted}`}>
                  <span>Evidence Hash:</span>
                  <span className="font-mono text-emerald-500">SHA256: 8f9a4c...1b9e</span>
                </div>
              </div>
            </div>

            {/* Right: Violation Details & Adjudication Controls */}
            <div className="space-y-4 font-mono text-xs">
              <div className={`p-4 rounded-2xl border space-y-3 ${innerBg}`}>
                <div className={`text-xs uppercase font-bold border-b pb-2.5 flex items-center justify-between ${dividerBorder} ${textTitle}`}>
                  <span>Offense Telemetry</span>
                  <span className="text-amber-500 text-sm font-bold">Fine: ₹{currentViolation.fineAmount.toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <div className={`flex items-center justify-between py-1 border-b ${dividerBorder}`}>
                    <span className={`font-sans ${textMuted}`}>Target Registration:</span>
                    <span className="text-base font-bold text-amber-500">{currentViolation.plate}</span>
                  </div>

                  <div className={`flex items-center justify-between py-1 border-b ${dividerBorder}`}>
                    <span className={`font-sans ${textMuted}`}>Violation Classification:</span>
                    <span className={`font-bold text-sm font-sans ${textTitle}`}>{currentViolation.violationType}</span>
                  </div>

                  <div className={`flex items-center justify-between py-1 border-b ${dividerBorder}`}>
                    <span className={`font-sans ${textMuted}`}>Time of Offense:</span>
                    <span className={`font-bold ${textTitle}`}>{dateStr} {timeStr}</span>
                  </div>

                  <div className={`flex items-center justify-between py-1 border-b ${dividerBorder}`}>
                    <span className={`font-sans ${textMuted}`}>AI Model Confidence:</span>
                    <span className="text-emerald-500 font-bold">{currentViolation.confidence}% Match</span>
                  </div>

                  {currentViolation.adjudicatedBy && (
                    <div className={`flex items-center justify-between py-1 border-b ${dividerBorder}`}>
                      <span className={`font-sans ${textMuted}`}>Adjudicated Officer:</span>
                      <span className={`font-bold font-sans ${textTitle}`}>{currentViolation.adjudicatedBy}</span>
                    </div>
                  )}

                  {currentViolation.rejectionReason && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-[11px] font-sans">
                      <b>Rejection Reason:</b> {currentViolation.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Officer Adjudication Notes */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase font-sans ${textMuted}`}>
                  Control Room Investigation Notes
                </label>
                <textarea
                  rows={2}
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  placeholder="Add notes for the judicial citation or internal review log..."
                  className={`w-full p-3 rounded-xl text-xs font-sans focus:outline-none border ${
                    isDark 
                      ? 'bg-black border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
                  }`}
                />
              </div>

              {/* Rejection Form Modal State */}
              {showRejectForm ? (
                <div className="p-3.5 bg-red-500/10 border border-red-500/40 rounded-xl space-y-2.5">
                  <div className="text-xs font-bold text-red-500 font-sans">Specify Rejection / Dismissal Justification:</div>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className={`w-full rounded-xl p-2.5 text-xs font-sans focus:outline-none border ${
                      isDark ? 'bg-black border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="">-- Select Justification --</option>
                    <option value="Emergency Vehicle Exemption (Ambulance/Fire/Police)">Emergency Vehicle Exemption (Ambulance/Fire/Police)</option>
                    <option value="Optical Plate Recognition False Positive">Optical Plate Recognition False Positive</option>
                    <option value="Traffic Police Manual Directive / Signal Diverted">Traffic Police Manual Directive / Signal Diverted</option>
                    <option value="Number Plate Obscured / Ambiguous Character">Number Plate Obscured / Ambiguous Character</option>
                  </select>

                  <div className="flex items-center gap-2 pt-1 font-sans">
                    <button
                      type="button"
                      disabled={!rejectionReason}
                      onClick={handleReject}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow"
                    >
                      Confirm Rejection
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className={`px-3.5 py-2 rounded-xl text-xs ${
                        isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Primary Action Buttons */
                <div className="space-y-2 pt-1 font-sans">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Issue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRejectForm(true)}
                      className="py-2.5 bg-red-500/15 hover:bg-red-600/30 border border-red-500/35 text-red-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleMarkReview}
                      className="py-2.5 bg-amber-500/15 hover:bg-amber-600/30 border border-amber-500/35 text-amber-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Mark Review</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPrintChallan(true)}
                      className={`py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border ${
                        isDark 
                          ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200' 
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Official Notice (Print)</span>
                    </button>

                    {onNavigateToTracking && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToTracking(currentViolation.plate);
                        }}
                        className={`py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border ${
                          isDark 
                            ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200' 
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Track Trajectory</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Printable Official Challan Preview */}
          {showPrintChallan && (
            <div className="mt-6 p-6 bg-white text-slate-900 rounded-2xl border-2 border-slate-300 space-y-4 font-sans print-page shadow-lg">
              {/* Challan Official Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <div className="text-base font-bold uppercase tracking-wider text-slate-900">
                    GOVERNMENT OF KARNATAKA — BANGALORE TRAFFIC POLICE
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">
                    TRAFFIC MANAGEMENT CENTER (TMC), INFANTRY ROAD, BENGALURU - 560001
                  </div>
                  <div className="text-sm font-bold text-red-700 mt-1">
                    ELECTRONIC TRAFFIC VIOLATION NOTICE (NOTICE U/S 133 OF M.V. ACT 1988)
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <div className="text-xs font-bold text-slate-900">NOTICE #: {currentViolation.challanNumber}</div>
                  <div className="text-slate-600">DATE: {dateStr}</div>
                </div>
              </div>

              {/* Vehicle & Offense Details Table */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="border border-slate-300 p-3 rounded-lg space-y-1">
                  <div className="text-slate-500 font-bold uppercase">Vehicle Registration</div>
                  <div className="text-base font-bold text-slate-900">{currentViolation.plate}</div>
                  <div className="text-slate-700 font-sans">Class: {currentViolation.vehicleType} ({currentViolation.vehicleColor})</div>
                  <div className="text-slate-700 font-sans">Owner: Rameshwaram Logistics & Holdings Pvt Ltd</div>
                </div>

                <div className="border border-slate-300 p-3 rounded-lg space-y-1">
                  <div className="text-slate-500 font-bold uppercase">Violation Particulars</div>
                  <div className="text-sm font-bold text-red-700">{currentViolation.violationType}</div>
                  <div className="text-slate-700 font-sans">Location: {currentViolation.location} ({currentViolation.cameraCode})</div>
                  <div className="text-slate-700">Time: {timeStr} IST | Fine: <b>₹{currentViolation.fineAmount}</b></div>
                </div>
              </div>

              {/* Evidence Snapshot & Legal Stamp */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="text-[11px] text-slate-600 max-w-lg font-sans">
                  Notice is hereby served that the vehicle was recorded by Automated AI Traffic Surveillance Cameras. Please pay the fine within 15 days online at bangaloretrafficpolice.gov.in or Karnataka One centers.
                </div>
                <div className="text-center font-mono text-[10px] border border-slate-400 p-2.5 rounded-lg">
                  <div className="font-bold text-slate-900 uppercase">OFFICIAL SEAL</div>
                  <div className="text-slate-600">BTP TMC ADJUDICATION</div>
                  <div className="text-emerald-700 font-bold mt-1">✓ DIGITALLY VERIFIED</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 no-print">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Official Notice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintChallan(false)}
                  className="px-3.5 py-2 bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
