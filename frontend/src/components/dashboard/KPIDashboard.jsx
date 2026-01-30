import React from 'react';
import { ArrowUp, ArrowDown, Minus, Activity, DollarSign, Clock, Battery } from 'lucide-react';
import ComparisonCharts from './ComparisonCharts';

const KPICard = ({ title, value, baselineValue, unit = '', inverse = false, icon: Icon }) => {
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
            if (inverse) {
                trendColor = diff > 0 ? 'text-danger' : 'text-primary';
            } else {
                trendColor = diff > 0 ? 'text-primary' : 'text-danger';
            }
        }
    }

    return (
        <div className="bg-panel border border-panel-border p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-colors">
            <div className="flex justify-between items-start z-10">
                <h3 className="text-[10px] text-text-muted uppercase tracking-wider font-bold">{title}</h3>
                {Icon && <Icon size={14} className="text-text-muted opacity-50" />}
            </div>
            
            <div className="flex items-end gap-2 mt-4 z-10">
                <span className="text-2xl font-bold text-text-main tracking-tight font-mono">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                    <span className="text-sm font-normal text-text-muted ml-1">{unit}</span>
                </span>
            </div>

            {hasDiff && Math.abs(diff) > 0.001 && (
                <div className={`flex items-center gap-1 text-[10px] mt-1 ${trendColor} font-bold z-10`}>
                    {diff > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    <span>{Math.abs(percentChange).toFixed(1)}%</span>
                </div>
            )}
            
            {/* Background decoration */}
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl group-hover:from-white/10 transition-colors"></div>
        </div>
    );
};

const KPIDashboard = ({ results }) => {
    if (!results) {
        return <div className="flex items-center justify-center h-full text-text-muted text-xs uppercase tracking-widest">Initialization Required</div>;
    }

    const { baseline, scenario } = results;
    
    const kpis = scenario ? scenario.kpis.city_kpis : (baseline ? baseline.kpis.city_kpis : null);
    const baseKpis = (scenario && baseline) ? baseline.kpis.city_kpis : null;

    if (!kpis) return null;

    return (
        <div className="flex gap-4 h-full">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-4 gap-4 flex-1">
                <KPICard 
                    title="Avg Wait Time" 
                    value={kpis.avg_wait_time} 
                    baselineValue={baseKpis?.avg_wait_time} 
                    unit="m"
                    inverse={true}
                    icon={Clock} 
                />
                <KPICard 
                    title="Lost Swaps" 
                    value={kpis.lost_swaps_pct * 100} 
                    baselineValue={baseKpis?.lost_swaps_pct ? baseKpis.lost_swaps_pct * 100 : undefined} 
                    unit="%"
                    inverse={true}
                    icon={Activity}
                />
                <KPICard 
                    title="Charger Util" 
                    value={kpis.charger_utilization * 100} 
                    baselineValue={baseKpis?.charger_utilization ? baseKpis.charger_utilization * 100 : undefined} 
                    unit="%"
                    icon={Battery}
                />
                <KPICard 
                    title="Cost Proxy" 
                    value={kpis.cost_proxy} 
                    baselineValue={baseKpis?.cost_proxy} 
                    inverse={true}
                    icon={DollarSign}
                />
            </div>

            {/* Charts Section - Visible only if scenario exists for valid comparison */}
            {scenario && baseKpis && (
                <div className="w-1/3 bg-panel border border-panel-border rounded-xl p-2 hidden lg:block ">
                    <h3 className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2 ml-2">Scenario Impact</h3>
                    <div className="h-full pb-6">
                        <ComparisonCharts baseline={baseKpis} scenario={kpis} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default KPIDashboard;
