import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const KPIRow = ({ label, value, baselineValue, unit = '', highlight = false, invertTrend = false }) => { 
    // Calculate Diff
    let diff = 0;
    let percentChange = 0;
    let hasDiff = false;
    let trendColor = 'text-text-muted';

    if (baselineValue !== undefined && baselineValue !== null && typeof value === 'number') {
        hasDiff = true;
        diff = value - baselineValue;
        percentChange = ((value - baselineValue) / baselineValue) * 100;
        if (baselineValue === 0) percentChange = 0;

        if (Math.abs(diff) > 0.001) {
            // Logic: InvertTrend=true means "Lower is Better" (Wait Time, Lost Swaps)
            // positive diff (increased) -> BAD
            if (invertTrend) {
                trendColor = diff > 0 ? 'text-danger' : 'text-primary';
            } else {
                // InvertTrend=false means "Higher is Better" (Throughput)
                // positive diff (increased) -> GOOD
                trendColor = diff > 0 ? 'text-primary' : 'text-danger';
            }
        }
    }

    return (
        <div className="flex justify-between items-center py-2 border-b border-panel-border last:border-0 group">
            <span className="text-xs text-text-muted group-hover:text-text-main transition-colors">{label}</span>
            <div className="flex flex-col items-end">
                <span className={`text-sm font-mono ${highlight ? 'text-text-main font-bold' : 'text-text-main'}`}>
                    {typeof value === 'number' ? value.toFixed(2) : value} {unit}
                </span>
                {hasDiff && Math.abs(diff) > 0.001 && (
                     <span className={`text-[10px] flex items-center gap-1 ${trendColor}`}>
                        {diff > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                        {Math.abs(percentChange).toFixed(1)}%
                     </span>
                )}
            </div>
        </div>
    );
};

const StationInfo = ({ station, kpiData, baselineKpiData }) => {
    if (!station) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-3 opacity-50">
                <div className="w-16 h-16 rounded-full bg-panel border-2 border-dashed border-panel-border flex items-center justify-center text-2xl">📍</div>
                <div className="text-center">
                     <p className="text-sm font-bold">No Station Selected</p>
                     <p className="text-xs">Select a marker on the map to view details</p>
                </div>
            </div>
        );
    }
    
    // Determine if it's a newly added station (no baseline data)
    const isNew = !baselineKpiData && kpiData;

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-gradient-to-br from-panel to-bg-dark p-4 rounded-xl border border-panel-border shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-text-main mb-1">{station.station_id}</h3>
                        <div className="flex items-center gap-2">
                             <span className="text-xs text-text-muted font-mono">{station.lat.toFixed(4)}, {station.lon.toFixed(4)}</span>
                        </div>
                    </div>
                    {isNew && <span className="px-2 py-0.5 rounded text-[10px] bg-primary text-bg-dark font-bold uppercase">New</span>}
                </div>
                
                <div className="mt-4 flex gap-2">
                     <span className={`flex-1 py-1 rounded text-[10px] uppercase font-bold tracking-wider text-center border border-dashed
                        ${station.tier === 'high' ? 'border-danger/30 text-danger bg-danger/5' : 
                          station.tier === 'medium' ? 'border-accent/30 text-accent bg-accent/5' : 'border-primary/30 text-primary bg-primary/5'
                        }`}>
                        {station.tier} Tier
                    </span>
                </div>
            </div>

            {/* Static Config */}
            <div>
                <h4 className="text-[10px] font-bold text-text-muted uppercase mb-2 ml-1">Infrastructure</h4>
                <div className="bg-panel p-4 rounded-xl border border-panel-border">
                    <KPIRow label="Chargers" value={station.chargers} />
                    <KPIRow label="Swap Bays" value={station.bays} />
                    <KPIRow label="Inventory" value={station.inventory_capacity} />
                    <KPIRow label="Initial SoH" value={station.initial_charged} />
                </div>
            </div>

            {/* Simulation Results */}
            {kpiData && (
                <div>
                     <h4 className="text-[10px] font-bold text-text-muted uppercase mt-6 mb-2 ml-1 flex justify-between">
                         <span>Performance</span>
                         {baselineKpiData && <span className="text-primary text-[10px]">vs baseline</span>}
                     </h4>
                     <div className="bg-panel p-4 rounded-xl border border-primary/20 shadow-[0_0_15px_-5px_var(--color-primary)]">
                        <KPIRow label="Avg Wait Time" value={kpiData.avg_wait_time} baselineValue={baselineKpiData?.avg_wait_time} unit="m" highlight invertTrend />
                        <KPIRow label="Lost Swaps" value={kpiData.lost_swaps} baselineValue={baselineKpiData?.lost_swaps} invertTrend />
                        <KPIRow label="Lost Swaps %" value={kpiData.lost_swaps_pct * 100} baselineValue={baselineKpiData ? baselineKpiData.lost_swaps_pct * 100 : undefined} unit="%" invertTrend />
                        <KPIRow label="Charger Util." value={kpiData.charger_utilization * 100} baselineValue={baselineKpiData ? baselineKpiData.charger_utilization * 100 : undefined} unit="%" />
                        <KPIRow label="Bay Util." value={kpiData.bay_utilization * 100} baselineValue={baselineKpiData ? baselineKpiData.bay_utilization * 100 : undefined} unit="%" />
                     </div>
                </div>
            )}
            
            {!kpiData && (
                <div className="p-4 rounded-xl border border-dashed border-panel-border bg-white/5 text-center mt-4">
                    <p className="text-xs text-text-muted">Run simulation to view KPIs</p>
                </div>
            )}
        </div>
    );
};

export default StationInfo;
