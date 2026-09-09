import React, { useState } from 'react';
import { Vehicle } from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { Search, Car, ShieldAlert, ArrowRight, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface VehicleSearchProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
  onNavigate: (tab: NavTab, meta?: any) => void;
  initialQuery?: string;
}

export const VehicleSearch: React.FC<VehicleSearchProps> = ({
  onSelectVehicle,
  onNavigate,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [vehicleType, setVehicleType] = useState<string>('All');
  const [hasViolationOnly, setHasViolationOnly] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(!!initialQuery);

  const isDark = trafficStore.getTheme() === 'dark';

  const results = trafficStore.searchVehicles(query, {
    type: vehicleType,
    hasViolation: hasViolationOnly ? true : undefined
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  const handleQuickSelect = (plate: string) => {
    setQuery(plate);
    setSearched(true);
    const v = trafficStore.getVehicleByPlate(plate);
    if (v) {
      onSelectVehicle(v);
    }
  };

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`pb-4 border-b ${dividerBorder}`}>
        <h2 className={`text-xl font-extrabold tracking-tight font-sans ${textTitle}`}>
          Vehicle Registration Lookup & Intelligence
        </h2>
        <p className={`text-xs mt-1 font-sans ${textMuted}`}>
          Query central RTO and optical surveillance records across 50+ Bengaluru ANPR intersection cameras.
        </p>
      </div>

      {/* Main Search Hero Box */}
      <div className={`${cardBg} border rounded-2xl p-6 space-y-4`}>
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className={`block text-xs font-mono font-bold uppercase tracking-wider mb-2 ${textMuted}`}>
              Enter Vehicle Registration Number (Plate)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  placeholder="e.g. KA01AB1234, KA03MN4521, KA05XY7812..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toUpperCase())}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-2xl text-lg font-mono font-bold focus:outline-none border-2 transition-colors ${
                    isDark 
                      ? 'bg-black border-neutral-800 text-amber-400 placeholder:text-neutral-700 focus:border-neutral-500' 
                      : 'bg-slate-50 border-slate-200 text-amber-600 placeholder:text-slate-400 focus:border-slate-400 shadow-inner'
                  }`}
                />
              </div>
              <button
                type="submit"
                className={`px-7 py-3.5 rounded-2xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow border ${
                  isDark 
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Search Records</span>
              </button>
            </div>
          </div>

          {/* Monitored Target Plates */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
            <span className={`font-semibold ${textMuted}`}>Monitored Plates:</span>
            <button
              type="button"
              onClick={() => handleQuickSelect('KA01AB1234')}
              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/40 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>KA01AB1234</span>
              <span className="text-[10px] opacity-80 font-normal font-sans">(Toyota Fortuner)</span>
            </button>
            {(['KA05XY7812', 'KA03MN4521', 'KA41P9821', 'KA51MD3029']).map(plt => (
              <button
                key={plt}
                type="button"
                onClick={() => handleQuickSelect(plt)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors border ${
                  isDark 
                    ? 'bg-black border-neutral-800 text-neutral-300 hover:bg-neutral-900' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {plt}
              </button>
            ))}
          </div>

          {/* Search Filters */}
          <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-4 text-xs ${dividerBorder}`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 font-mono">
                <span className={`font-medium ${textMuted}`}>Vehicle Class:</span>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className={`rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none border ${
                    isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="All">All Classes</option>
                  <option value="Car">Car</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Auto-rickshaw">Auto-rickshaw</option>
                  <option value="Bus">Bus</option>
                  <option value="Truck">Truck</option>
                </select>
              </div>

              <label className={`flex items-center gap-2 cursor-pointer select-none ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                <input
                  type="checkbox"
                  checked={hasViolationOnly}
                  onChange={(e) => setHasViolationOnly(e.target.checked)}
                  className="rounded border-neutral-700 text-neutral-900 focus:ring-0"
                />
                <span className="font-sans">With Violations Only</span>
              </label>
            </div>

            <div className={`font-mono text-[11px] ${textMuted}`}>
              Found {results.length} registered vehicles
            </div>
          </div>
        </form>
      </div>

      {/* Search Results */}
      <div className="space-y-3">
        <h3 className={`text-xs font-mono uppercase tracking-wider font-bold ${textMuted}`}>
          Search Results ({results.length})
        </h3>

        {results.length === 0 ? (
          <div className={`${cardBg} border rounded-2xl p-10 text-center space-y-3`}>
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <div className={`text-sm font-semibold font-sans ${textTitle}`}>
              Vehicle <span className="font-mono text-amber-500 font-bold">"{query}"</span> was not found in available records
            </div>
            <p className={`text-xs max-w-md mx-auto font-sans ${textMuted}`}>
              Please verify the registration plate format (e.g. KA01AB1234) or clear filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.slice(0, 12).map(veh => {
              const riskBadge = 
                veh.riskLevel === 'Critical' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                veh.riskLevel === 'High' ? 'bg-orange-500/15 text-orange-500 border-orange-500/30' :
                veh.riskLevel === 'Medium' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
                'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

              return (
                <div
                  key={veh.id}
                  onClick={() => onSelectVehicle(veh)}
                  className={`${cardBg} border p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between group`}
                >
                  <div>
                    <div className={`flex items-center justify-between pb-2.5 border-b ${dividerBorder}`}>
                      <span className="font-mono text-base font-bold text-amber-500 tracking-wider">
                        {veh.plate}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${riskBadge}`}>
                        {veh.riskLevel.toUpperCase()} RISK
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs font-mono">
                      <div className={`font-sans font-bold text-sm truncate ${textTitle}`}>
                        {veh.makeModel}
                      </div>
                      <div className={`flex items-center justify-between ${textMuted}`}>
                        <span>Class / Color:</span>
                        <span className={textTitle}>{veh.type} • {veh.color}</span>
                      </div>
                      <div className={`flex items-center justify-between ${textMuted}`}>
                        <span>First Seen:</span>
                        <span className={textTitle}>{veh.firstSeen}</span>
                      </div>
                      <div className={`flex items-center justify-between ${textMuted}`}>
                        <span>Last Seen:</span>
                        <span className={textTitle}>{veh.lastSeen}</span>
                      </div>
                      <div className={`flex items-center justify-between ${textMuted}`}>
                        <span>Camera Sightings:</span>
                        <span className={`font-bold ${textTitle}`}>{veh.sightingsCount} nodes</span>
                      </div>
                      <div className={`flex items-center justify-between ${textMuted}`}>
                        <span>Violations Logged:</span>
                        <span className={`font-bold ${veh.violationsCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {veh.violationsCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-sans ${dividerBorder}`}>
                    <span className={`text-[11px] truncate max-w-[140px] ${textMuted}`}>
                      {veh.registeredOwner}
                    </span>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border ${
                        isDark 
                          ? 'bg-neutral-900 group-hover:bg-neutral-800 text-white border-neutral-700' 
                          : 'bg-slate-100 group-hover:bg-slate-200 text-slate-900 border-slate-200'
                      }`}
                    >
                      <span>Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
