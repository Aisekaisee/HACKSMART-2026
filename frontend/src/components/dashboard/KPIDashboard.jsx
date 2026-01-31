import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Activity, DollarSign, Clock, Battery, PieChart as PieIcon, BarChart3, GitCompare } from 'lucide-react';
import ComparisonCharts from './ComparisonCharts';
import ComparisonView from './ComparisonView';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import AnimatedCounter from '../common/AnimatedCounter';

const KPICard = ({ title, value, baselineValue, unit = '', inverse = false, icon: Icon, isCost = false }) => {
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
    
    // Formatting
    const formatVal = (v) => {
        if (isCost) {
            if (v >= 10000000) return `₹${(v/10000000).toFixed(2)}Cr`;
            if (v >= 100000) return `₹${(v/100000).toFixed(2)}L`;
            return `₹${v.toLocaleString()}`;
        }
        return typeof v === 'number' ? v.toFixed(2) : v;
    };

    return (
        <div className="bg-panel border border-panel-border p-3 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-colors min-w-[140px]">
            <div className="flex justify-between items-start z-10">
                <h3 className="text-[10px] text-text-muted uppercase tracking-wider font-bold truncate">{title}</h3>
                {Icon && <Icon size={12} className="text-text-muted opacity-50" />}
            </div>
            
            <div className="flex items-end gap-1 mt-2 z-10">
                <span className="text-lg font-bold text-text-main tracking-tight font-mono">
                    {isCost ? (
                        formatVal(value) // Cost formatting is complex, keep static or make custom counter? 
                        // Let's us simple counter for non-cost, or just wrap formatting logic?
                        // For simplicity, let's animate numeric parts only if possible, or skip for complex strings.
                        // Actually, AnimatedCounter supports prefix/suffix mostly. 
                        // Let's stick to formatted static for cost to avoid flicker on complex currency strings 
                        // OR enhance AnimatedCounter.
                        // Given time constraints, I'll just animate standard metrics.
                    ) : (
                        <AnimatedCounter value={value} decimals={2} />
                    )}
                    {!isCost && <span className="text-xs font-normal text-text-muted ml-0.5">{unit}</span>}
                </span>
            </div>

            {hasDiff && Math.abs(diff) > 0.001 && (
                <div className={`flex items-center gap-1 text-[10px] mt-1 ${trendColor} font-bold z-10`}>
                    {diff > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    <span>{Math.abs(percentChange).toFixed(1)}%</span>
                </div>
            )}
            
            {/* Background decoration */}
            <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl group-hover:from-white/10 transition-colors"></div>
        </div>
    );
};

const FinancialBreakdown = ({ costs }) => {
    if (!costs) return null;
    
    // Process cost data for chart
    const data = [
        { name: 'CapEx', value: costs.capital.total, color: '#3b82f6' },
        { name: 'OpEx (Daily)', value: costs.operational_24hr.total, color: '#f59e0b' },
        { name: 'Lost Rev', value: costs.opportunity.lost_revenue, color: '#ef4444' }
    ];

    return (
        <div className="h-full flex items-center">
            <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                    <Pie 
                        data={data} 
                        innerRadius={25} 
                        outerRadius={40} 
                        paddingAngle={5} 
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <RechartsTooltip 
                        contentStyle={{backgroundColor: '#171717', border: '1px solid #262626', fontSize: '10px'}}
                        formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="text-[10px] space-y-1 min-w-[80px]">
                {data.map(d => (
                    <div key={d.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>
                        <span className="text-text-muted">{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const KPIDashboard = ({ results }) => {
    const [viewMode, setViewMode] = useState('operational'); // operational | financial

    console.log(results);

    if (!results) {
        return <div className="flex items-center justify-center h-full text-text-muted text-xs uppercase tracking-widest">Initialization Required</div>;
    }

    const { baseline, scenario, comparison } = results;
    
    const kpis = scenario ? scenario.kpis.city_kpis : (baseline ? baseline.kpis.city_kpis : null);
    const baseKpis = (scenario && baseline) ? baseline.kpis.city_kpis : null;
    
    const costs = scenario ? scenario.costs : (baseline ? baseline.costs : null);
    const baseCosts = (scenario && baseline) ? baseline.costs : null;
    
    // ROI Logic
    let roi = null;
    let payback = null;
    if (comparison && comparison.cost_deltas) {
        const deltaCap = comparison.cost_deltas.capital_delta;
        const deltaProfit = comparison.cost_deltas.profit_delta;
        
        if (deltaCap > 0 && deltaProfit > 0) {
            payback = deltaCap / deltaProfit; // Days
        }
    }

    if (!kpis) return null;

    return (
        <div className='h-full mb-2'>
            <div className=" left-0 bg-panel border border-panel-border rounded-lg p-1 flex">
                <button 
                    onClick={() => setViewMode('operational')}
                    className={`px-3 py-1 text-[10px] uppercase font-bold rounded ${viewMode === 'operational' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:text-text-main'}`}
                    >
                    Ops
                </button>
                <button 
                    onClick={() => setViewMode('financial')}
                    className={`px-3 py-1 text-[10px] uppercase font-bold rounded ${viewMode === 'financial' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:text-text-main'}`}
                >
                    Finance
                </button>
                <button 
                    onClick={() => setViewMode('comparison')}
                    className={`px-3 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1 ${viewMode === 'comparison' ? 'bg-accent text-bg-dark' : 'text-text-muted hover:text-text-main'}`}
                >
                    <GitCompare size={10} /> Compare
                </button>
            </div>

        <div className="flex gap-4 h-full relative">
            {/* View Switcher */}

            {/* Grid */}
            <div className="flex-1 grid grid-cols-4 gap-4">
                {viewMode === 'operational' && (
                    <>
                        <KPICard title="Wait Time" value={kpis.avg_wait_time} baselineValue={baseKpis?.avg_wait_time} unit="m" inverse={true} icon={Clock} />
                        <KPICard title="Lost Swaps" value={kpis.lost_swaps_pct} baselineValue={baseKpis?.lost_swaps_pct || undefined} unit="%" inverse={true} icon={Activity} />
                        <KPICard title="Charger Util" value={kpis.charger_utilization * 100} baselineValue={baseKpis?.charger_utilization ? baseKpis.charger_utilization * 100 : undefined} unit="%" icon={Battery} />
                        <KPICard title="Throughput" value={kpis.throughput} baselineValue={baseKpis?.throughput} unit="/hr" icon={Zap} />
                    </>
                )}
                
                {viewMode === 'financial' && costs && (
                    <>
                        <KPICard title="Net Profit (Daily)" value={costs.summary.net_operational_profit} baselineValue={baseCosts?.summary.net_operational_profit} isCost={true} icon={DollarSign} />
                        <KPICard title="Total CapEx" value={costs.capital.total} baselineValue={baseCosts?.capital.total} isCost={true} inverse={true} icon={BarChart3} />
                         {payback ? (
                             <KPICard title="ROI Payback" value={payback} unit=" days" inverse={true} icon={Clock} />
                            ) : (
                             <div className="bg-panel border border-panel-border p-3 rounded-xl flex items-center justify-center text-text-muted text-[10px]">No ROI Data</div>
                            )}
                         <div className="bg-panel border border-panel-border p-2 rounded-xl">
                             <FinancialBreakdown costs={costs} />
                         </div>
                    </>
                )}
                
                {viewMode === 'comparison' && (
                    <div className="col-span-4">
                        <ComparisonView 
                            baseline={baseline} 
                            scenario={scenario} 
                            comparison={comparison} 
                        />
                    </div>
                )}
            </div>

            {/* Charts Section - Visible only if scenario exists for valid comparison */}
            {scenario && baseKpis && viewMode === 'operational' && (
                <div className="w-1/3 bg-panel border border-panel-border rounded-xl p-2 hidden lg:block">
                    <h3 className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2 ml-2">Scenario Impact</h3>
                    <div className="h-full pb-6">
                        <ComparisonCharts baseline={baseKpis} scenario={kpis} />
                    </div>
                </div>
            )}
            
            {/* Financial Charts Placeholder - can be expanded later */}
            {viewMode === 'financial' && (
                <div className="w-1/3 bg-panel border border-panel-border rounded-xl p-4 hidden lg:flex flex-col justify-center">
                    <p className="text-xs text-text-muted text-center italic">
                        {payback ? `Investment recovers in approx ${(payback/30).toFixed(1)} months.` : 'Run a scenario to see ROI projection.'}
                    </p>
                </div>
            )}
            </div>
        </div>
    );
};

// Simple Zap icon def since I forgot to import it in previous helper
const Zap = ({size, className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);

export default KPIDashboard;
