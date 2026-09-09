import React, { useState, useEffect } from 'react';
import { 
  X, Search, ShieldAlert, CheckCircle2, AlertTriangle, FileText, 
  Car, User, Calendar, MapPin, Gauge, Download, Printer, Route, 
  ExternalLink, CreditCard, Clock, Check, Eye, ShieldCheck, BookmarkPlus, BookmarkCheck
} from 'lucide-react';
import { VehicleDossier, RtoViolationDetail, Detection } from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { NavTab } from '../layout/Sidebar';

interface VehicleDossierModalProps {
  plate: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: NavTab, meta?: any) => void;
  onInspectViolation?: (violation: any) => void;
}

export const VehicleDossierModal: React.FC<VehicleDossierModalProps> = ({
  plate: initialPlate,
  isOpen,
  onClose,
  onNavigate,
  onInspectViolation
}) => {
  const isDark = trafficStore.getTheme() === 'dark';
  const [searchPlate, setSearchPlate] = useState<string>(initialPlate || '');
  const [activeTab, setActiveTab] = useState<'rto' | 'violations' | 'sightings'>('rto');
  const [dossier, setDossier] = useState<VehicleDossier | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchDossier = (targetPlate: string) => {
    if (!targetPlate || !targetPlate.trim()) return;
    const clean = targetPlate.toUpperCase().trim().replace(/[\s-]/g, '');
    const data = trafficStore.getVehicleDossier(clean);
    setDossier(data);
  };

  useEffect(() => {
    if (initialPlate) {
      setSearchPlate(initialPlate);
      fetchDossier(initialPlate);
    }
  }, [initialPlate, isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handlePayChallan = (challanId: string, challanNumber: string) => {
    trafficStore.payChallan(challanId);
    if (dossier) {
      fetchDossier(dossier.plate);
    }
    showNotification(`Challan #${challanNumber} marked as Paid / Settled successfully.`);
  };

  const handleToggleWatchlist = () => {
    if (!dossier) return;
    if (dossier.isWatchlisted) {
      const item = trafficStore.getWatchlist().find(w => w.plate === dossier.plate);
      if (item) trafficStore.removeFromWatchlist(item.id);
      showNotification(`Vehicle ${dossier.plate} removed from Security Watchlist.`);
    } else {
      trafficStore.addToWatchlist({
        plate: dossier.plate,
        vehicleType: dossier.type,
        color: dossier.color,
        reason: 'Flagged via RTO 360° Intelligence Dossier',
        priority: 'High',
        addedBy: 'TMC Traffic Intelligence',
        notes: 'Monitored across urban corridors',
        isActive: true
      });
      showNotification(`Vehicle ${dossier.plate} added to Security Watchlist.`);
    }
    fetchDossier(dossier.plate);
  };

  const handlePrintDossier = () => {
    window.print();
  };

  const cardBg = isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-slate-50 border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const divider = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden ${
        isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Top Search & Header Bar */}
        <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-bold text-lg ${textTitle}`}>Vehicle 360° Intelligence & RTO Dossier</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  NATIONAL RTO VERIFIED
                </span>
              </div>
              <p className={`text-xs ${textMuted}`}>Official vehicle registration specs, live radar sightings & violation history</p>
            </div>
          </div>

          {/* Search Input in Modal */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search any plate..."
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchDossier(searchPlate);
                }}
                className={`w-40 sm:w-52 pl-8 pr-3 py-1.5 rounded-xl text-xs font-mono font-bold border uppercase focus:outline-none transition-all ${
                  isDark ? 'bg-neutral-900 border-neutral-700 text-yellow-400 focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                }`}
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
            </div>
            <button
              type="button"
              onClick={() => fetchDossier(searchPlate)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs cursor-pointer shadow-sm"
            >
              Lookup
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isDark ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toast Notification Banner */}
        {toastMsg && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {dossier ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Header Plate Hero Card */}
            <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-100/80 border-slate-200'
            }`}>
              <div className="flex items-center gap-4">
                {/* Visual License Plate */}
                <div className="relative border-2 border-slate-700 bg-yellow-400 text-slate-950 font-mono font-extrabold text-xl sm:text-2xl px-4 py-2 rounded-xl flex items-center gap-3 shadow-md tracking-widest">
                  <div className="flex flex-col items-center justify-center pr-2 border-r border-slate-900/30">
                    <span className="text-[9px] font-bold">IND</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-700 flex items-center justify-center text-[7px] text-white">⚙</div>
                  </div>
                  <span>{dossier.plate}</span>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-base font-bold ${textTitle}`}>{dossier.makeModel}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono font-bold ${
                      dossier.riskLevel === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                      dossier.riskLevel === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}>
                      {dossier.riskLevel.toUpperCase()} RISK
                    </span>
                    {dossier.isWatchlisted && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold flex items-center gap-1 shadow animate-pulse">
                        <ShieldAlert className="w-3 h-3" />
                        WATCHLISTED
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${textMuted}`}>
                    {dossier.color} {dossier.type} • {dossier.fuelType} • Registered at {dossier.rtoOffice}
                  </p>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleToggleWatchlist}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    dossier.isWatchlisted
                      ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                      : isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {dossier.isWatchlisted ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                  <span>{dossier.isWatchlisted ? 'Remove Watchlist' : 'Add Watchlist'}</span>
                </button>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('tracking', { plate: dossier.plate });
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Route className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Track Map</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrintDossier}
                  className={`p-2 rounded-xl border text-neutral-400 hover:text-white transition-colors cursor-pointer ${
                    isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-slate-300 text-slate-600'
                  }`}
                  title="Print Official Dossier"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metric Counters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`${cardBg} border p-3 rounded-xl`}>
                <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>RC Status</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{dossier.rcStatus}</span>
                </div>
              </div>
              <div className={`${cardBg} border p-3 rounded-xl`}>
                <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Unpaid Challans</div>
                <div className="text-sm font-bold text-red-400 mt-0.5 font-mono">
                  {dossier.activeViolations.length} (₹{dossier.totalUnpaidFines})
                </div>
              </div>
              <div className={`${cardBg} border p-3 rounded-xl`}>
                <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Settled Penalties</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
                  {dossier.settledViolations.length} (₹{dossier.totalPaidFines})
                </div>
              </div>
              <div className={`${cardBg} border p-3 rounded-xl`}>
                <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Camera Sightings</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5 font-mono">
                  {dossier.sightingsCount} Interceptions
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className={`flex border-b text-xs font-semibold ${divider}`}>
              <button
                type="button"
                onClick={() => setActiveTab('rto')}
                className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'rto'
                    ? 'border-emerald-500 text-emerald-400 font-bold'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>RTO Ownership & Specs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('violations')}
                className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'violations'
                    ? 'border-emerald-500 text-emerald-400 font-bold'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Violations Intelligence ({dossier.activeViolations.length + dossier.settledViolations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sightings')}
                className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'sightings'
                    ? 'border-emerald-500 text-emerald-400 font-bold'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Camera Sightings ({dossier.recentSightings.length})</span>
              </button>
            </div>

            {/* Tab 1: RTO Ownership & RC Specifications */}
            {activeTab === 'rto' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Owner Dossier */}
                  <div className={`${cardBg} border rounded-2xl p-4 space-y-3`}>
                    <div className="flex items-center gap-2 pb-2 border-b border-neutral-800 text-amber-400 font-bold">
                      <User className="w-4 h-4" />
                      <span>Owner Profile & Address</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className={textMuted}>Registered Owner:</span>
                        <span className={`font-bold font-sans ${textTitle}`}>{dossier.registeredOwner}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className={textMuted}>RTO Authority:</span>
                        <span className={`font-bold ${textTitle}`}>{dossier.rtoOffice}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className={textMuted}>Registration Date:</span>
                        <span className="font-mono text-neutral-300 font-bold">{dossier.registrationDate} ({dossier.vehicleAge})</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className={textMuted}>Registered State:</span>
                        <span className="font-bold text-cyan-400">{dossier.registeredState}</span>
                      </div>
                    </div>
                  </div>

                  {/* Engine & Chassis Specs */}
                  <div className={`${cardBg} border rounded-2xl p-4 space-y-3`}>
                    <div className="flex items-center gap-2 pb-2 border-b border-neutral-800 text-emerald-400 font-bold">
                      <Car className="w-4 h-4" />
                      <span>Technical Specs & Verification</span>
                    </div>
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className={`font-sans ${textMuted}`}>Chassis Number:</span>
                        <span className="font-bold text-neutral-200">{dossier.chassisNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className={`font-sans ${textMuted}`}>Engine Number:</span>
                        <span className="font-bold text-neutral-200">{dossier.engineNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className={`font-sans ${textMuted}`}>Fuel Type:</span>
                        <span className="font-bold text-white font-sans">{dossier.fuelType}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className={`font-sans ${textMuted}`}>Vehicle Class:</span>
                        <span className="font-bold text-white font-sans">{dossier.color} {dossier.type}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insurance & PUCC Compliance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`${cardBg} border rounded-2xl p-4 space-y-2`}>
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">Motor Insurance Policy</div>
                    <div className="font-bold text-white text-xs">{dossier.insurancePolicy}</div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-800">
                      <span className={textMuted}>Valid Until: <b className="text-neutral-200">{dossier.insuranceValidUntil}</b></span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                        ACTIVE POLICY
                      </span>
                    </div>
                  </div>

                  <div className={`${cardBg} border rounded-2xl p-4 space-y-2`}>
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">PUCC Pollution Certificate</div>
                    <div className="font-mono font-bold text-white text-xs">{dossier.puccNumber}</div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-800">
                      <span className={textMuted}>Valid Until: <b className="text-neutral-200">{dossier.puccValidUntil}</b></span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                        COMPLIANT (BS-VI)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Violations Intelligence */}
            {activeTab === 'violations' && (
              <div className="space-y-4 text-xs">
                {/* Active / Ongoing Unpaid Violations */}
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
                    <h3 className="font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Active / Unpaid Infractions ({dossier.activeViolations.length})</span>
                    </h3>
                    <span className="font-mono text-rose-400 font-bold">Total Due: ₹{dossier.totalUnpaidFines}</span>
                  </div>

                  {dossier.activeViolations.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>No active or unpaid violations on this vehicle registration.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dossier.activeViolations.map((viol) => (
                        <div key={viol.id} className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                                {viol.challanNumber}
                              </span>
                              <span className="font-bold text-white text-xs">{viol.violationType}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                                UNPAID
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                              <span>Location: <b className="text-neutral-300">{viol.location}</b></span>
                              <span>•</span>
                              <span>Time: {new Date(viol.timestamp).toLocaleString()}</span>
                            </div>
                            {viol.notes && (
                              <p className="text-[11px] text-neutral-400 italic">{viol.notes}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className="font-mono font-bold text-base text-rose-400 pr-2">
                              ₹{viol.fineAmount}
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePayChallan(viol.id, viol.challanNumber)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Settle Fine</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Past / Settled Violations */}
                <div className="pt-2">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
                    <h3 className="font-bold text-neutral-300 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Past / Settled Violations History ({dossier.settledViolations.length})</span>
                    </h3>
                    <span className="font-mono text-emerald-400 font-bold">Paid: ₹{dossier.totalPaidFines}</span>
                  </div>

                  {dossier.settledViolations.length === 0 ? (
                    <div className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-500 text-center">
                      No past violation history on record.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dossier.settledViolations.map((viol) => (
                        <div key={viol.id} className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/40 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-neutral-400">{viol.challanNumber}</span>
                              <span className="font-semibold text-white">{viol.violationType}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                SETTLED
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              {viol.location} • {new Date(viol.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="font-mono font-semibold text-neutral-400">₹{viol.fineAmount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Camera Sightings Timeline */}
            {activeTab === 'sightings' && (
              <div className="space-y-3 text-xs">
                <div className="text-neutral-400 text-xs">
                  Chronological ANPR interceptions across Bengaluru TMC camera network:
                </div>

                <div className="space-y-2">
                  {dossier.recentSightings.map((sighting, idx) => (
                    <div key={sighting.id || idx} className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-neutral-800 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">{sighting.cameraCode}</span>
                            <span className="font-bold text-white">{sighting.cameraName}</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-2">
                            <span>{sighting.location}</span>
                            <span>•</span>
                            <span>Lane #{sighting.laneNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">{sighting.speed} km/h</div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {new Date(sighting.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-neutral-500">
            <Car className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm">Enter a license plate above to view vehicle dossier.</p>
          </div>
        )}
      </div>
    </div>
  );
};
