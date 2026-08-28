import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  ShieldAlert, 
  Route, 
  Camera, 
  CheckCircle2, 
  User, 
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { trafficStore } from '../../services/trafficStore';
import { Violation, Camera as CameraType, TrajectoryRoute } from '../../types';

export const ReportsPage: React.FC = () => {
  const [selectedReportType, setSelectedReportType] = useState<'Daily Traffic' | 'Violations' | 'Vehicle Movement' | 'Camera Health'>('Vehicle Movement');
  const [targetPlate, setTargetPlate] = useState<string>('KA01AB1234');
  const [dateRange, setDateRange] = useState<string>('2026-08-28');

  const stats = trafficStore.getDashboardStats();
  const violations = trafficStore.getViolations();
  const cameras = trafficStore.getCameras();
  const trajectory = trafficStore.getVehicleTrajectory(targetPlate);
  const currentUser = trafficStore.getCurrentUser();
  const isDark = trafficStore.getTheme() === 'dark';

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (selectedReportType === 'Violations') {
      csvContent += "Challan_ID,Plate,Violation_Type,Location,Camera,Timestamp,Fine_Amount,Status\n";
      violations.forEach(v => {
        csvContent += `${v.challanNumber},${v.plate},${v.violationType},"${v.location}",${v.cameraCode},${v.timestamp},${v.fineAmount},${v.status}\n`;
      });
    } else if (selectedReportType === 'Camera Health') {
      csvContent += "Camera_Code,Name,Zone,Status,Uptime,Vehicles_Today,Violations_Today\n";
      cameras.forEach(c => {
        csvContent += `${c.code},"${c.name}",${c.zone},${c.status},${c.uptime}%,${c.vehiclesToday},${c.violationsToday}\n`;
      });
    } else {
      csvContent += "Step,Camera_Code,Location,Timestamp,Speed_KMH,Confidence,Violation\n";
      trajectory?.points.forEach((p, idx) => {
        csvContent += `${idx + 1},${p.cameraCode},"${p.location}",${p.timestamp},${p.speed},${p.confidence}%,${p.violationDetected ? 'YES' : 'NO'}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CITYWATCH_${selectedReportType.replace(/\s+/g, '_')}_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b no-print ${dividerBorder}`}>
        <div>
          <h2 className={`text-xl font-extrabold tracking-tight font-sans ${textTitle}`}>
            Official Reports & Judicial Audit Dossier
          </h2>
          <p className={`text-xs mt-1 font-sans ${textMuted}`}>
            Generate printable certified reports for legal prosecution, traffic engineering, and department briefings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border shadow-xs ${
              isDark ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow border ${
              isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* Report Configuration Selector */}
      <div className={`${cardBg} border rounded-2xl p-4 space-y-3 font-mono text-xs no-print`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className={`font-medium ${textMuted}`}>Template:</span>
            {(['Vehicle Movement', 'Violations', 'Daily Traffic', 'Camera Health'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedReportType(t)}
                className={`px-3 py-1.5 rounded-xl transition-colors border ${
                  selectedReportType === t 
                    ? isDark ? 'bg-neutral-800 text-white border-neutral-600 font-bold' : 'bg-slate-900 text-white border-slate-900 font-bold' 
                    : isDark ? 'bg-black text-neutral-400 border-neutral-800 hover:bg-neutral-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {selectedReportType === 'Vehicle Movement' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className={`font-medium ${textMuted}`}>Target Plate:</span>
              <input
                type="text"
                value={targetPlate}
                onChange={(e) => setTargetPlate(e.target.value.toUpperCase())}
                className={`p-2 rounded-xl font-bold uppercase w-36 text-center focus:outline-none border ${
                  isDark ? 'bg-black border-neutral-800 text-amber-400 focus:border-neutral-500' : 'bg-slate-50 border-slate-200 text-amber-600 focus:border-slate-400'
                }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Printable Report Document Surface */}
      <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-300 font-sans space-y-6 print-page">
        {/* Official Letterhead */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl font-mono shadow">
              BTP
            </div>
            <div>
              <h1 className="text-lg font-extrabold uppercase tracking-wide text-slate-900">
                GOVERNMENT OF KARNATAKA — BANGALORE TRAFFIC POLICE
              </h1>
              <p className="text-xs text-slate-600 font-semibold">
                CENTRAL TRAFFIC MANAGEMENT & COMMAND CENTER (TMC), BENGALURU
              </p>
              <p className="text-xs text-slate-500 font-mono">
                AI ENGINE TELEMETRY & MULTI-CAMERA SURVEILLANCE DOSSIER
              </p>
            </div>
          </div>

          <div className="text-right font-mono text-xs text-slate-700">
            <div className="font-bold text-slate-900">DOC REF: BTP/AI-SURV/2026/08</div>
            <div>DATE: 28 AUG 2026</div>
            <div>TIME: 10:42:18 IST</div>
          </div>
        </div>

        {/* Report Title */}
        <div className="bg-slate-100 p-3.5 rounded-lg border border-slate-300 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-500 font-bold uppercase block">SUBJECT:</span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {selectedReportType === 'Vehicle Movement' ? `VEHICLE TRAJECTORY & RE-IDENTIFICATION AUDIT: ${targetPlate}` :
               selectedReportType === 'Violations' ? `CONSOLIDATED TRAFFIC ENFORCEMENT & E-CHALLAN AUDIT` :
               selectedReportType === 'Daily Traffic' ? `DAILY CITY-WIDE URBAN TRAFFIC INTELLIGENCE BRIEFING` :
               `SURVEILLANCE SENSOR INFRASTRUCTURE & HEALTH AUDIT`}
            </span>
          </div>
          <span className="px-3 py-1 bg-slate-900 text-white rounded-md font-mono text-xs font-bold">
            CONFIDENTIAL / POLICE USE
          </span>
        </div>

        {/* Document Content Based on Selected Template */}
        {selectedReportType === 'Vehicle Movement' && trajectory && (
          <div className="space-y-6">
            {/* Target Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">VEHICLE REGISTRATION</div>
                <div className="text-base font-bold text-slate-900">{trajectory.plate}</div>
                <div className="text-slate-600">{trajectory.vehicleType} • {trajectory.vehicleColor}</div>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">TOTAL ROUTE DISTANCE</div>
                <div className="text-base font-bold text-slate-900">{trajectory.totalDistanceKm} km</div>
                <div className="text-slate-600">8 Cameras Crossed</div>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">TOTAL TRANSIT TIME</div>
                <div className="text-base font-bold text-slate-900">{Math.floor(trajectory.totalTravelTimeMinutes / 60)}h {trajectory.totalTravelTimeMinutes % 60}m</div>
                <div className="text-slate-600">Avg Speed: {trajectory.avgSpeedKmh} km/h</div>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">RE-ID CONFIDENCE</div>
                <div className="text-base font-bold text-emerald-700">{trajectory.reIdConfidence}% Match</div>
                <div className="text-slate-600">Deep Visual Embedding</div>
              </div>
            </div>

            {/* Sequential Sighting Audit Trail Table */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 mb-2">
                Sequential Chronological Sightings Across Bengaluru Nodes:
              </h3>
              <table className="w-full text-left text-xs font-mono border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300">#</th>
                    <th className="p-2 border-r border-slate-300">Timestamp</th>
                    <th className="p-2 border-r border-slate-300">Camera Code</th>
                    <th className="p-2 border-r border-slate-300">Location</th>
                    <th className="p-2 border-r border-slate-300">Speed</th>
                    <th className="p-2 border-r border-slate-300">ANPR Match</th>
                    <th className="p-2">Recorded Violation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {trajectory.points.map((pt, idx) => (
                    <tr key={idx} className={pt.violationDetected ? 'bg-red-50' : ''}>
                      <td className="p-2 border-r border-slate-300 font-bold">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300">{new Date(pt.timestamp).toLocaleTimeString('en-US')}</td>
                      <td className="p-2 border-r border-slate-300 font-bold">{pt.cameraCode}</td>
                      <td className="p-2 border-r border-slate-300">{pt.location}</td>
                      <td className="p-2 border-r border-slate-300">{pt.speed} km/h</td>
                      <td className="p-2 border-r border-slate-300 text-emerald-800 font-bold">{pt.confidence}%</td>
                      <td className="p-2 font-bold text-red-700">
                        {pt.violationDetected ? `⚠️ ${pt.violationType}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inter-Camera Kinematic Transitions */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 mb-2">
                Kinematic Transition & Segment Analysis:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {trajectory.segments.slice(0, 6).map((seg, idx) => (
                  <div key={idx} className="border border-slate-300 p-2.5 rounded-lg bg-slate-50">
                    <div className="font-bold text-slate-900">{seg.fromCamera} → {seg.toCamera}</div>
                    <div className="text-slate-600 text-[11px] mt-0.5">
                      Distance: <b>{seg.distanceKm} km</b> | Transit: <b>{seg.timeMinutes}m</b> | Avg Speed: <b>{seg.avgSpeedKmh} km/h</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Violations Report Template */}
        {selectedReportType === 'Violations' && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">TOTAL VIOLATIONS</div>
                <div className="text-lg font-bold text-slate-900">{violations.length} Offenses</div>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">CONFIRMED CHALLANS</div>
                <div className="text-lg font-bold text-emerald-700">{violations.filter(v => v.status === 'Confirmed').length}</div>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">PENALTY DEMAND</div>
                <div className="text-lg font-bold text-amber-700">₹{(violations.reduce((s, v) => s + v.fineAmount, 0)).toLocaleString()}</div>
              </div>
            </div>

            <table className="w-full text-left text-xs font-mono border border-slate-300">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300">Challan ID</th>
                  <th className="p-2 border-r border-slate-300">Plate</th>
                  <th className="p-2 border-r border-slate-300">Violation</th>
                  <th className="p-2 border-r border-slate-300">Location</th>
                  <th className="p-2 border-r border-slate-300">Fine</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {violations.slice(0, 10).map(v => (
                  <tr key={v.id}>
                    <td className="p-2 border-r border-slate-300 font-bold">{v.challanNumber}</td>
                    <td className="p-2 border-r border-slate-300 font-bold">{v.plate}</td>
                    <td className="p-2 border-r border-slate-300">{v.violationType}</td>
                    <td className="p-2 border-r border-slate-300">{v.location}</td>
                    <td className="p-2 border-r border-slate-300 font-bold">₹{v.fineAmount}</td>
                    <td className="p-2 font-bold">{v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Daily Traffic Template */}
        {selectedReportType === 'Daily Traffic' && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-4 gap-3">
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">DETECTIONS TODAY</div>
                <div className="text-base font-bold text-slate-900">{stats.vehiclesDetectedToday.toLocaleString()}</div>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">ACTIVE CAMERAS</div>
                <div className="text-base font-bold text-slate-900">{stats.activeCameras} of {stats.totalCameras}</div>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">AVG CITY SPEED</div>
                <div className="text-base font-bold text-slate-900">{stats.averageCitySpeed} km/h</div>
              </div>
              <div className="border border-slate-300 p-3 rounded-lg">
                <div className="text-slate-500 text-[10px]">PEAK CONGESTION</div>
                <div className="text-base font-bold text-red-700">{stats.peakTrafficTime}</div>
              </div>
            </div>
          </div>
        )}

        {/* Camera Health Template */}
        {selectedReportType === 'Camera Health' && (
          <div className="space-y-4 font-mono text-xs">
            <table className="w-full text-left text-xs font-mono border border-slate-300">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300">Camera Code</th>
                  <th className="p-2 border-r border-slate-300">Location</th>
                  <th className="p-2 border-r border-slate-300">Zone</th>
                  <th className="p-2 border-r border-slate-300">Uptime</th>
                  <th className="p-2 border-r border-slate-300 font-bold">Status</th>
                  <th className="p-2">Vehicles Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cameras.slice(0, 10).map(c => (
                  <tr key={c.id}>
                    <td className="p-2 border-r border-slate-300 font-bold">{c.code}</td>
                    <td className="p-2 border-r border-slate-300">{c.name}</td>
                    <td className="p-2 border-r border-slate-300">{c.zone}</td>
                    <td className="p-2 border-r border-slate-300 font-bold">{c.uptime}%</td>
                    <td className="p-2 border-r border-slate-300 font-bold">{c.status}</td>
                    <td className="p-2">{c.vehiclesToday}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Official Signatures & Digital Stamp */}
        <div className="pt-8 border-t-2 border-slate-900 flex items-center justify-between font-mono text-xs">
          <div>
            <div className="font-bold text-slate-900">{currentUser.name}</div>
            <div className="text-slate-600">BADGE #{currentUser.badgeNumber} | {currentUser.role}</div>
            <div className="text-slate-500">{currentUser.department}</div>
          </div>

          <div className="text-center border-2 border-dashed border-slate-400 p-3 rounded-lg">
            <div className="text-[10px] font-bold text-slate-900 uppercase">DIGITAL POLICE STAMP</div>
            <div className="text-[9px] text-slate-600">BENGALURU TMC CERTIFIED</div>
            <div className="text-[9px] font-bold text-emerald-800 mt-0.5">SHA-256 VERIFIED</div>
          </div>
        </div>
      </div>
    </div>
  );
};
