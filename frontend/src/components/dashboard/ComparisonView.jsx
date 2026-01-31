import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Minus, DollarSign, Clock, AlertTriangle, Zap } from 'lucide-react';
import AnimatedCounter from '../common/AnimatedCounter';

const ComparisonView = ({ baseline, scenario, comparison }) => {
  if (!baseline || !scenario) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Run a scenario comparison to see results here
      </div>
    );
  }

  const baselineKpis = baseline.kpis?.city_kpis || {};
  const scenarioKpis = scenario.kpis?.city_kpis || {};

  // Calculate deltas
  const calculateDelta = (base, scen, lowerIsBetter = false) => {
    if (base === 0) return { value: 0, pct: 0, improved: false };
    const diff = scen - base;
    const pct = (diff / base) * 100;
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    return { value: diff, pct, improved };
  };

  const metrics = [
    {
      label: 'Wait Time',
      baseline: baselineKpis.avg_wait_time,
      scenario: scenarioKpis.avg_wait_time,
      unit: 'min',
      icon: Clock,
      lowerIsBetter: true,
      format: (v) => v?.toFixed(1) || '—'
    },
    {
      label: 'Lost Swaps',
      baseline: baselineKpis.lost_swaps_pct,
      scenario: scenarioKpis.lost_swaps_pct,
      unit: '%',
      icon: AlertTriangle,
      lowerIsBetter: true,
      format: (v) => v?.toFixed(1) || '—'
    },
    {
      label: 'Utilization',
      baseline: (baselineKpis.charger_utilization || 0) * 100,
      scenario: (scenarioKpis.charger_utilization || 0) * 100,
      unit: '%',
      icon: Zap,
      lowerIsBetter: false,
      format: (v) => v?.toFixed(1) || '—'
    },
    {
      label: 'Throughput',
      baseline: baselineKpis.throughput,
      scenario: scenarioKpis.throughput,
      unit: '/hr',
      icon: TrendingUp,
      lowerIsBetter: false,
      format: (v) => v?.toFixed(0) || '—'
    }
  ];

  // Cost comparison
  const baselineCosts = baseline.costs || {};
  const scenarioCosts = scenario.costs || {};
  const costDelta = (scenarioCosts.total_cost || 0) - (baselineCosts.total_cost || 0);

  return (
    <div className="h-full flex flex-col gap-4 p-4  custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-center gap-4 pb-3 border-b border-panel-border">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Baseline</div>
          <div className="text-xs font-bold text-text-main">Current Network</div>
        </div>
        <ArrowRight size={20} className="text-primary" />
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-primary mb-1">Scenario</div>
          <div className="text-xs font-bold text-primary">With Changes</div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => {
          const delta = calculateDelta(metric.baseline, metric.scenario, metric.lowerIsBetter);
          const Icon = metric.icon;
          
          return (
            <div key={metric.label} className="bg-panel border border-panel-border rounded-lg p-3">
              {/* Label */}
              <div className="flex items-center gap-2 mb-2">
                <Icon size={12} className="text-text-muted" />
                <span className="text-[10px] uppercase tracking-wider text-text-muted">{metric.label}</span>
              </div>
              
              {/* Values */}
              <div className="flex items-end justify-between">
                {/* Baseline */}
                <div className="text-center">
                  <div className="text-lg font-mono font-bold text-text-muted">
                    {metric.format(metric.baseline)}
                  </div>
                  <div className="text-[9px] text-text-muted">{metric.unit}</div>
                </div>
                
                {/* Arrow */}
                <div className="flex flex-col items-center mx-2">
                  <ArrowRight size={14} className="text-panel-border" />
                </div>
                
                {/* Scenario */}
                <div className="text-center">
                  <div className={`text-lg font-mono font-bold ${delta.improved ? 'text-primary' : 'text-danger'}`}>
                    <AnimatedCounter value={metric.scenario} format={(v) => metric.format(v)} />
                  </div>
                  <div className="text-[9px] text-text-muted">{metric.unit}</div>
                </div>
              </div>
              
              {/* Delta Badge */}
              <div className="mt-2 pt-2 border-t border-panel-border flex justify-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1
                  ${delta.improved 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : delta.pct === 0 
                      ? 'bg-white/5 text-text-muted border border-panel-border'
                      : 'bg-danger/10 text-danger border border-danger/20'
                  }`}>
                  {delta.improved ? <TrendingUp size={10} /> : delta.pct === 0 ? <Minus size={10} /> : <TrendingDown size={10} />}
                  {delta.pct > 0 ? '+' : ''}{delta.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cost Summary */}
      <div className="bg-panel border border-panel-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={14} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-main">Cost Impact</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-text-muted uppercase mb-1">Baseline Cost</div>
            <div className="text-sm font-mono font-bold text-text-muted">
              ₹{((baselineCosts.total_cost || 0) / 100000).toFixed(1)}L
            </div>
          </div>
          <ArrowRight size={16} className="text-panel-border" />
          <div>
            <div className="text-[10px] text-primary uppercase mb-1">Scenario Cost</div>
            <div className="text-sm font-mono font-bold text-primary">
              ₹{((scenarioCosts.total_cost || 0) / 100000).toFixed(1)}L
            </div>
          </div>
          <div className={`px-3 py-2 rounded-lg ${costDelta > 0 ? 'bg-danger/10 border border-danger/20' : 'bg-primary/10 border border-primary/20'}`}>
            <div className="text-[10px] text-text-muted uppercase mb-1">Delta</div>
            <div className={`text-sm font-mono font-bold ${costDelta > 0 ? 'text-danger' : 'text-primary'}`}>
              {costDelta > 0 ? '+' : ''}₹{(costDelta / 100000).toFixed(1)}L
            </div>
          </div>
        </div>
      </div>

      {/* ROI Section */}
      {comparison?.cost_deltas?.payback_days && (
        <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-lg p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-primary mb-1">Estimated Payback Period</div>
          <div className="text-2xl font-mono font-bold text-primary">
            <AnimatedCounter value={comparison.cost_deltas.payback_days} /> days
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonView;
