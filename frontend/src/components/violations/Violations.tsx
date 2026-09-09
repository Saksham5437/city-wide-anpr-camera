import React, { useState } from 'react';
import { Violation, ViolationType, ViolationStatus } from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  Download,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface ViolationsProps {
  violations: Violation[];
  onInspectViolation: (violation: Violation) => void;
  onNavigate: (tab: NavTab, meta?: any) => void;
}

export const Violations: React.FC<ViolationsProps> = ({
  violations,
  onInspectViolation,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const isDark = trafficStore.getTheme() === 'dark';

  const categories: (ViolationType | 'All')[] = [
    'All',
    'Speeding',
    'Red Light',
    'Wrong Way',
    'Illegal Parking',
    'No Helmet',
    'No Seatbelt',
    'Lane Violation',
    'Stop Line Violation'
  ];

  const statuses: (ViolationStatus | 'All')[] = [
    'All',
    'New',
    'Under Review',
    'Confirmed',
    'Rejected',
    'Resolved'
  ];

  // Filter violations
  const filteredViolations = violations.filter(v => {
    const matchSearch = 
      !searchQuery || 
      v.plate.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.challanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.cameraCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = selectedType === 'All' || v.violationType === selectedType;
    const matchStatus = selectedStatus === 'All' || v.status === selectedStatus;

    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.ceil(filteredViolations.length / itemsPerPage) || 1;
  const paginatedViolations = filteredViolations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalFineValue = filteredViolations.reduce((sum, v) => sum + v.fineAmount, 0);

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${dividerBorder}`}>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className={`text-xl font-extrabold tracking-tight font-sans ${textTitle}`}>
              Traffic Violations & E-Challan Management
            </h2>
            <span className="px-2.5 py-0.5 bg-red-500/15 text-red-500 border border-red-500/30 text-xs font-mono rounded-full font-bold">
              {filteredViolations.length} Active Records
            </span>
          </div>
          <p className={`text-xs mt-1 font-sans ${textMuted}`}>
            Automated optical violation detection with video evidence, ANPR optical verification, and official adjudication.
          </p>
        </div>

        {/* Total Fine Metric */}
        <div className={`${cardBg} px-4 py-2 rounded-2xl border flex items-center gap-3 font-mono text-xs shadow-xs`}>
          <span className={textMuted}>Total Enforced Value:</span>
          <span className="text-amber-500 font-bold text-sm">₹{totalFineValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`${cardBg} border rounded-2xl p-4 space-y-3`}>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              placeholder="Search vehicle plate (e.g. KA01AB1234), Challan # (BLR-2026-10428), location, camera..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none border ${
                isDark 
                  ? 'bg-black border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
              }`}
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 font-mono text-xs">
            {statuses.map(st => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setSelectedStatus(st);
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-colors border ${
                  selectedStatus === st 
                    ? isDark ? 'bg-neutral-800 text-white border-neutral-600 font-bold' : 'bg-slate-900 text-white border-slate-900 font-bold'
                    : isDark ? 'bg-black text-neutral-400 hover:bg-neutral-900 border-neutral-800' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className={`pt-2.5 border-t flex flex-wrap items-center gap-1.5 text-xs ${dividerBorder}`}>
          <span className={`font-medium mr-1 font-mono text-[11px] ${textMuted}`}>Offense Type:</span>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedType(cat);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors border ${
                selectedType === cat 
                  ? isDark ? 'bg-neutral-800 text-white border-neutral-600 font-bold' : 'bg-slate-900 text-white border-slate-900 font-bold'
                  : textMuted
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Violations Data Table */}
      <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className={`border-b font-semibold uppercase text-[11px] ${dividerBorder} ${
                isDark ? 'bg-neutral-900 text-neutral-400' : 'bg-slate-50 text-slate-600'
              }`}>
                <th className="py-3.5 px-3.5">Challan ID</th>
                <th className="py-3.5 px-3.5">Vehicle Plate</th>
                <th className="py-3.5 px-3.5">Violation Type</th>
                <th className="py-3.5 px-3.5">Location & Camera</th>
                <th className="py-3.5 px-3.5">Timestamp</th>
                <th className="py-3.5 px-3.5">AI Confidence</th>
                <th className="py-3.5 px-3.5">Fine Amount</th>
                <th className="py-3.5 px-3.5">Status</th>
                <th className="py-3.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dividerBorder}`}>
              {paginatedViolations.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`py-12 text-center font-sans ${textMuted}`}>
                    No violations found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedViolations.map(viol => {
                  const timeStr = new Date(viol.timestamp).toLocaleTimeString('en-US', { hour12: false });
                  const dateStr = new Date(viol.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                  const statusBadge = 
                    viol.status === 'Confirmed' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
                    viol.status === 'New' ? 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30' :
                    viol.status === 'Under Review' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
                    viol.status === 'Rejected' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                    'bg-slate-500/15 text-slate-400 border-slate-500/30';

                  return (
                    <tr 
                      key={viol.id}
                      onClick={() => onInspectViolation(viol)}
                      className={`cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-neutral-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`py-3.5 px-3.5 font-bold ${textTitle}`}>{viol.challanNumber}</td>
                      <td className="py-3.5 px-3.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('search', { query: viol.plate });
                          }}
                          className="font-bold text-amber-500 hover:underline"
                        >
                          {viol.plate}
                        </button>
                        <div className={`text-[10px] font-sans ${textMuted}`}>{viol.vehicleType} • {viol.vehicleColor}</div>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className={`font-bold font-sans ${textTitle}`}>{viol.violationType}</span>
                        {viol.recordedSpeed && (
                          <div className="text-[10px] text-red-500 font-bold">
                            {viol.recordedSpeed} km/h (Limit: {viol.speedLimit})
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className={`font-sans ${textTitle}`}>{viol.location}</div>
                        <div className="text-[10px] font-bold text-neutral-400">{viol.cameraCode}</div>
                      </td>
                      <td className={`py-3.5 px-3.5 ${textMuted}`}>
                        <div>{timeStr}</div>
                        <div className="text-[10px] opacity-75">{dateStr}</div>
                      </td>
                      <td className="py-3.5 px-3.5 text-emerald-500 font-bold">{viol.confidence}%</td>
                      <td className="py-3.5 px-3.5 font-bold text-amber-500">₹{viol.fineAmount.toLocaleString()}</td>
                      <td className="py-3.5 px-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] border font-bold ${statusBadge}`}>
                          {viol.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectViolation(viol);
                          }}
                          className={`px-3 py-1 rounded-xl text-[11px] font-sans font-semibold transition-colors border ${
                            isDark 
                              ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' 
                              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                          }`}
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className={`p-3.5 border-t flex items-center justify-between font-mono text-xs ${dividerBorder} ${
            isDark ? 'bg-neutral-950 text-neutral-300' : 'bg-slate-50 text-slate-700'
          }`}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={`px-3.5 py-1.5 disabled:opacity-30 rounded-xl border transition-colors ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
              }`}
            >
              ← Previous
            </button>
            <span className={textMuted}>Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredViolations.length)} of {filteredViolations.length}</span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={`px-3.5 py-1.5 disabled:opacity-30 rounded-xl border transition-colors ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
              }`}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
