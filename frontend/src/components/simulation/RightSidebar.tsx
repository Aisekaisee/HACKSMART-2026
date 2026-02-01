import { useAppSelector } from "@/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  AlertTriangle,
  Battery,
  Zap,
  TrendingUp,
  DollarSign,
  BarChart3,
  IndianRupee,
  Building2,
  Receipt,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
  ArrowRight,
} from "lucide-react";
import type { FinancialData } from "@/types";

export default function RightSidebar() {
  const { simulationResult } = useAppSelector((state) => state.scenarios);
  const { selectedStationId } = useAppSelector((state) => state.ui);
  const { stations } = useAppSelector((state) => state.stations);
  const { currentProject } = useAppSelector((state) => state.projects);

  const cityKpis = simulationResult?.kpis?.city_kpis;
  const baselineKpis = currentProject?.baseline_kpis;
  const financialData = simulationResult?.costs;
  const selectedStation = stations.find((s) => s.id === selectedStationId);
  const selectedStationKpi = simulationResult?.kpis?.stations?.find(
    (s) => s.station_id === selectedStation?.station_id,
  );

  return (
    <aside className="w-96 border-l border-border bg-background flex flex-col overflow-hidden shrink-0 shadow-xl z-10">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analytics
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Performance metrics and financial analysis
        </p>
      </div>

      <div className="flex-1 overflow-auto bg-card/30">
        <Tabs defaultValue="overview" className="flex flex-col h-full">
          <div className="px-4 pt-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-2 border-b border-border/50">
            <TabsList className="grid w-full grid-cols-4 bg-secondary/50 p-1 rounded-lg">
              <TabsTrigger value="overview" className="text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="finance" className="text-xs">
                Finance
              </TabsTrigger>
              <TabsTrigger value="compare" className="text-xs">
                Compare
              </TabsTrigger>
              <TabsTrigger value="station" className="text-xs">
                Station
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 p-4 space-y-4">
            {/* Overview Tab */}
            <TabsContent
              value="overview"
              className="m-0 space-y-4 data-[state=inactive]:hidden animate-in fade-in slide-in-from-right-5 duration-300"
            >
              {!simulationResult ? (
                <EmptyState message="Run a simulation to view performance KPIs" />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <KPICard
                      icon={<Clock className="h-4 w-4" />}
                      title="Wait Time"
                      value={cityKpis?.avg_wait_time?.toFixed(1) || "0"}
                      unit="min"
                      baseline={baselineKpis?.avg_wait_time}
                      lowerIsBetter
                    />
                    <KPICard
                      icon={<AlertTriangle className="h-4 w-4" />}
                      title="Lost Swaps"
                      value={cityKpis?.lost_swaps_pct?.toFixed(1) || "0"}
                      unit="%"
                      baseline={baselineKpis?.lost_swaps_pct}
                      lowerIsBetter
                    />
                    <KPICard
                      icon={<Battery className="h-4 w-4" />}
                      title="Idle Inv"
                      value={cityKpis?.idle_inventory_pct?.toFixed(1) || "0"}
                      unit="%"
                      baseline={baselineKpis?.idle_inventory_pct}
                      lowerIsBetter
                    />
                    <KPICard
                      icon={<Zap className="h-4 w-4" />}
                      title="Utilization"
                      value={(
                        (cityKpis?.charger_utilization || 0) * 100
                      ).toFixed(1)}
                      unit="%"
                      baseline={
                        baselineKpis?.charger_utilization
                          ? baselineKpis.charger_utilization * 100
                          : undefined
                      }
                      lowerIsBetter={false}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <KPICard
                      icon={<TrendingUp className="h-4 w-4" />}
                      title="Throughput"
                      value={cityKpis?.throughput?.toFixed(0) || "0"}
                      unit="swaps/h"
                      baseline={baselineKpis?.throughput}
                      lowerIsBetter={false}
                      className="col-span-2"
                    />
                  </div>

                  {/* Quick Summary */}
                  <Card className="bg-card border-border shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-center text-sm border-b border-border pb-2">
                        <span className="text-muted-foreground">
                          Total Arrivals
                        </span>
                        <span className="font-semibold text-foreground">
                          {cityKpis?.total_arrivals?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Total Lost Demand
                        </span>
                        <span className="font-semibold text-destructive">
                          {cityKpis?.total_lost?.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Finance Tab */}
            <TabsContent
              value="finance"
              className="m-0 space-y-4 data-[state=inactive]:hidden animate-in fade-in slide-in-from-right-5 duration-300"
            >
              {!simulationResult || !financialData ? (
                <EmptyState
                  message="Run a simulation to view financial analysis"
                  icon={
                    <IndianRupee className="h-10 w-10 text-muted-foreground/50 mb-4" />
                  }
                />
              ) : (
                <FinanceTab financialData={financialData} />
              )}
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent
              value="compare"
              className="m-0 space-y-4 data-[state=inactive]:hidden animate-in fade-in slide-in-from-right-5 duration-300"
            >
              {!simulationResult ? (
                <EmptyState
                  message="Run a simulation to compare with baseline"
                  icon={
                    <GitCompare className="h-10 w-10 text-muted-foreground/50 mb-4" />
                  }
                />
              ) : !baselineKpis ? (
                <div className="text-center py-10 bg-card border border-dashed border-border rounded-lg">
                  <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-foreground font-medium">
                    No Baseline Available
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Run a baseline simulation first to enable detailed
                    comparison.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-lg p-3 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        Baseline
                      </span>
                      <span className="text-sm font-semibold">
                        Standard Day
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-muted-foreground">
                        Simulated
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        Active Scenario
                      </span>
                    </div>
                  </div>

                  <Card className="bg-card border-border shadow-none">
                    <CardHeader className="py-3 px-4 bg-secondary/20">
                      <CardTitle className="text-sm">
                        Key Performance Deltas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-xs">
                        <thead className="bg-secondary/30 text-muted-foreground">
                          <tr>
                            <th className="text-left py-2 px-4 font-medium">
                              Metric
                            </th>
                            <th className="text-right py-2 px-2 font-medium">
                              Base
                            </th>
                            <th className="text-right py-2 px-4 font-medium">
                              Curr
                            </th>
                            <th className="text-right py-2 px-4 font-medium">
                              Delta
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <ComparisonRow
                            label="Wait Time"
                            baseline={baselineKpis.avg_wait_time}
                            current={cityKpis?.avg_wait_time || 0}
                            unit="m"
                            lowerIsBetter
                          />
                          <ComparisonRow
                            label="Lost Swaps"
                            baseline={baselineKpis.lost_swaps_pct}
                            current={cityKpis?.lost_swaps_pct || 0}
                            unit="%"
                            lowerIsBetter
                          />
                          <ComparisonRow
                            label="Idle Inv"
                            baseline={baselineKpis.idle_inventory_pct}
                            current={cityKpis?.idle_inventory_pct || 0}
                            unit="%"
                            lowerIsBetter
                          />
                          <ComparisonRow
                            label="Utilization"
                            baseline={baselineKpis.charger_utilization * 100}
                            current={(cityKpis?.charger_utilization || 0) * 100}
                            unit="%"
                            lowerIsBetter={false}
                          />
                          <ComparisonRow
                            label="Throughput"
                            baseline={baselineKpis.throughput}
                            current={cityKpis?.throughput || 0}
                            unit=""
                            lowerIsBetter={false}
                          />
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card border border-border p-3 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">
                        Cost Efficiency
                      </p>
                      <div
                        className={`text-lg font-bold mt-1 ${
                          (cityKpis?.cost_proxy || 0) <
                          (baselineKpis.cost_proxy || 0)
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                      >
                        {(
                          (1 -
                            (cityKpis?.cost_proxy || 1) /
                              (baselineKpis.cost_proxy || 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {(cityKpis?.cost_proxy || 0) <
                        (baselineKpis.cost_proxy || 0)
                          ? "Improved"
                          : "Worsened"}
                      </p>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">
                        Service Level
                      </p>
                      <div
                        className={`text-lg font-bold mt-1 ${
                          (cityKpis?.lost_swaps_pct || 0) <
                          (baselineKpis.lost_swaps_pct || 0)
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                      >
                        {Math.abs(
                          (cityKpis?.lost_swaps_pct || 0) -
                            (baselineKpis.lost_swaps_pct || 0),
                        ).toFixed(1)}
                        %
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {(cityKpis?.lost_swaps_pct || 0) <
                        (baselineKpis.lost_swaps_pct || 0)
                          ? "Better Retention"
                          : "More Loss"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Station Tab */}
            <TabsContent
              value="station"
              className="m-0 space-y-4 data-[state=inactive]:hidden animate-in fade-in slide-in-from-right-5 duration-300"
            >
              {!selectedStation ? (
                <EmptyState
                  message="Select a station on the map to view details"
                  icon={
                    <Building2 className="h-10 w-10 text-muted-foreground/50 mb-4" />
                  }
                />
              ) : (
                <div className="space-y-4">
                  <Card className="bg-card border-border shadow-none">
                    <CardHeader className="py-3 px-4 bg-secondary/20 flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle className="text-base">
                          {selectedStation.station_id}
                        </CardTitle>
                        {selectedStation.name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedStation.name}
                          </p>
                        )}
                      </div>
                      {selectedStationKpi?.tier && (
                        <Badge
                          variant="outline"
                          className="bg-background text-primary border-primary/30 uppercase text-[10px] tracking-wider"
                        >
                          {selectedStationKpi.tier} Tier
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          Chargers
                        </span>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold">
                            {selectedStation.chargers}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          Capacity
                        </span>
                        <div className="flex items-center gap-2">
                          <Battery className="h-4 w-4 text-green-500" />
                          <span className="font-semibold">
                            {selectedStation.inventory_cap}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedStationKpi ? (
                    <Card className="bg-card border-border shadow-none">
                      <CardHeader className="py-3 px-4 border-b border-border/50">
                        <CardTitle className="text-sm font-medium">
                          Performance Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-border/50">
                            <StationStatRow
                              label="Total Arrivals"
                              value={selectedStationKpi.total_arrivals.toLocaleString()}
                            />
                            <StationStatRow
                              label="Successful Swaps"
                              value={selectedStationKpi.successful_swaps.toLocaleString()}
                            />
                            <StationStatRow
                              label="Lost Demand"
                              value={`${selectedStationKpi.lost_swaps} (${selectedStationKpi.lost_swaps_pct.toFixed(1)}%)`}
                              isNegative
                            />
                            <StationStatRow
                              label="Avg Wait Time"
                              value={`${selectedStationKpi.avg_wait_time.toFixed(1)} min`}
                            />
                            <StationStatRow
                              label="Charger Util."
                              value={`${(selectedStationKpi.charger_utilization * 100).toFixed(1)}%`}
                              progress={
                                selectedStationKpi.charger_utilization * 100
                              }
                            />
                            <StationStatRow
                              label="Ready Inventory"
                              value={selectedStationKpi.avg_charged_inventory.toFixed(
                                1,
                              )}
                            />
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyState
                      message="Run a simulation to see station stats"
                      minimal
                    />
                  )}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </aside>
  );
}

// ---- Subcomponents ----

function EmptyState({
  message,
  icon,
  minimal,
}: {
  message: string;
  icon?: React.ReactNode;
  minimal?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${minimal ? "py-8" : "py-16"} px-4 border border-dashed border-border rounded-lg bg-card/50`}
    >
      {icon || (
        <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-4" />
      )}
      <p className="text-muted-foreground text-sm max-w-[200px]">{message}</p>
    </div>
  );
}

function KPICard({
  icon,
  title,
  value,
  unit,
  baseline,
  lowerIsBetter,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  unit: string;
  baseline?: number;
  lowerIsBetter: boolean;
  className?: string;
}) {
  const currentValue = parseFloat(value);
  const change = baseline ? ((currentValue - baseline) / baseline) * 100 : null;
  const isImprovement = change
    ? lowerIsBetter
      ? change < 0
      : change > 0
    : null;

  return (
    <Card
      className={`bg-card border-border shadow-sm hover:border-primary/30 transition-colors ${className}`}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {Math.abs(change || 0) > 0.1 && change !== null && (
          <div className="flex items-center gap-1 mt-1">
            {isImprovement ? (
              <ArrowUpRight
                className={`h-3 w-3 ${lowerIsBetter ? "rotate-180" : ""} text-primary`}
              />
            ) : (
              <ArrowDownRight
                className={`h-3 w-3 ${lowerIsBetter ? "rotate-180" : ""} text-destructive`}
              />
            )}
            <span
              className={`text-[10px] font-semibold ${
                isImprovement ? "text-primary" : "text-destructive"
              }`}
            >
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonRow({
  label,
  baseline,
  current,
  unit,
  lowerIsBetter,
}: {
  label: string;
  baseline: number;
  current: number;
  unit: string;
  lowerIsBetter: boolean;
}) {
  // Handle zero baseline
  let change = 0;
  if (baseline === 0) {
    change = current === 0 ? 0 : 100; // If baseline 0 and current > 0, it's 100% increase approx
  } else {
    change = ((current - baseline) / baseline) * 100;
  }

  const isImprovement = lowerIsBetter ? change < 0 : change > 0;
  // If almost no change, consider neutral
  const isNeutral = Math.abs(change) < 0.1;

  return (
    <tr className="hover:bg-muted/10 transition-colors">
      <td className="py-2 px-4 text-muted-foreground">{label}</td>
      <td className="text-right py-2 px-2 text-muted-foreground font-mono">
        {baseline.toFixed(1)}
        <span className="text-[10px] opacity-70 ml-0.5">{unit}</span>
      </td>
      <td className="text-right py-2 px-4 font-mono font-medium">
        {current.toFixed(1)}
        <span className="text-[10px] opacity-70 ml-0.5">{unit}</span>
      </td>
      <td
        className={`text-right py-2 px-4 font-bold text-[10px] ${
          isNeutral
            ? "text-muted-foreground"
            : isImprovement
              ? "text-green-500"
              : "text-red-500"
        }`}
      >
        {change > 0 && !isNeutral ? "+" : ""}
        {change.toFixed(1)}%
      </td>
    </tr>
  );
}

function StationStatRow({
  label,
  value,
  isNegative,
  progress,
}: {
  label: string;
  value: string;
  isNegative?: boolean;
  progress?: number;
}) {
  return (
    <tr className="group hover:bg-muted/20">
      <td className="py-2.5 px-4 text-muted-foreground">{label}</td>
      <td
        className={`py-2.5 px-4 text-right font-medium ${isNegative ? "text-destructive" : "text-foreground"}`}
      >
        {value}
        {progress !== undefined && (
          <div className="w-16 h-1 bg-secondary rounded-full ml-auto mt-1 overflow-hidden">
            <div
              className={`h-full ${progress > 90 ? "bg-red-500" : progress > 70 ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </td>
    </tr>
  );
}

// Finance Tab Component
function FinanceTab({ financialData }: { financialData: FinancialData }) {
  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const {
    capital,
    operational_24hr,
    revenue,
    opportunity,
    per_swap_economics,
    summary,
  } = financialData;
  const isProfit = summary.gross_profit > 0;

  return (
    <div className="space-y-4">
      {/* Profit Summary Card */}
      <Card
        className={`border-l-4 shadow-sm ${isProfit ? "border-l-primary bg-primary/5" : "border-l-destructive bg-destructive/5"}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Net Profit (24h)
            </span>
            <Badge
              variant={isProfit ? "outline" : "destructive"}
              className={`${isProfit ? "text-primary border-primary" : ""} text-xs`}
            >
              {summary.profit_margin_pct.toFixed(1)}% margin
            </Badge>
          </div>
          <p
            className={`text-3xl font-bold ${isProfit ? "text-primary" : "text-destructive"}`}
          >
            {isProfit ? "+" : ""}
            {formatCurrency(summary.gross_profit)}
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            {summary.successful_swaps.toLocaleString()} billable swaps
          </p>
        </CardContent>
      </Card>

      {/* Revenue Card - BatterySmart Pricing */}
      <Card className="bg-card border-border shadow-none">
        <CardHeader className="py-2 px-4 border-b border-border/50 bg-secondary/20">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            Revenue Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-2">
          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex flex-col">
                <span>Base Swaps</span>
                <span className="text-[10px] opacity-70">
                  ₹170 × {summary.successful_swaps}
                </span>
              </span>
              <span className="font-mono">
                {formatCurrency(revenue.base_swap)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex flex-col">
                <span>Service Fees</span>
                <span className="text-[10px] opacity-70">
                  ₹40 × {summary.successful_swaps}
                </span>
              </span>
              <span className="font-mono">
                {formatCurrency(revenue.service_charge)}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold">Total Revenue</span>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(revenue.total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Costs Card */}
      <Card className="bg-card border-border shadow-none">
        <CardHeader className="py-2 px-4 border-b border-border/50 bg-secondary/20">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            OpEx (24h)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-2">
          <div className="space-y-2 py-2">
            <CostRow
              label="Electricity"
              value={operational_24hr.breakdown.electricity}
            />
            <CostRow
              label="Labor Force"
              value={operational_24hr.breakdown.labor}
            />
            <CostRow
              label="Maintenance"
              value={operational_24hr.breakdown.maintenance}
            />
            <CostRow
              label="Rent & Infra"
              value={operational_24hr.breakdown.rent}
            />
            <CostRow
              label="Logistics"
              value={operational_24hr.breakdown.swap_operations}
            />
            <CostRow
              label="Replenishment"
              value={operational_24hr.breakdown.replenishment}
            />
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold">Total OpEx</span>
              <span className="text-sm font-bold text-orange-500">
                {formatCurrency(operational_24hr.total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {/* Per-Swap Economics */}
        <Card className="bg-card border-border shadow-none p-3">
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Unit Economics
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Rev/Swap</span>
              <span className="font-mono">₹{per_swap_economics.revenue}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Cost/Swap</span>
              <span className="font-mono">
                ₹{per_swap_economics.cost.toFixed(0)}
              </span>
            </div>
            <div className="border-t border-border mt-1 pt-1 flex justify-between text-xs font-bold">
              <span>Margin</span>
              <span
                className={
                  per_swap_economics.margin > 0
                    ? "text-primary"
                    : "text-destructive"
                }
              >
                ₹{per_swap_economics.margin.toFixed(0)}
              </span>
            </div>
          </div>
        </Card>

        {/* Lost Revenue */}
        <Card className="bg-card border-border shadow-none p-3 border-destructive/20 bg-destructive/5">
          <div className="text-xs font-medium text-destructive/80 uppercase mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Lost Oppty
          </div>
          <div className="text-xl font-bold text-destructive">
            -{formatCurrency(opportunity.lost_revenue)}
          </div>
          <div className="text-[10px] text-destructive/70 mt-1">
            {opportunity.lost_swaps} missed customers
          </div>
        </Card>
      </div>
    </div>
  );
}

// Cost Row Helper
function CostRow({ label, value }: { label: string; value: number }) {
  const formatCurrency = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  };

  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{formatCurrency(value)}</span>
    </div>
  );
}
