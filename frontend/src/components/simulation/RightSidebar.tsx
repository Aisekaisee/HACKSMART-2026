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
} from "lucide-react";

export default function RightSidebar() {
  const { simulationResult } = useAppSelector((state) => state.scenarios);
  const { selectedStationId } = useAppSelector((state) => state.ui);
  const { stations } = useAppSelector((state) => state.stations);
  const { currentProject } = useAppSelector((state) => state.projects);

  const cityKpis = simulationResult?.kpis?.city_kpis;
  const baselineKpis = currentProject?.baseline_kpis;
  const selectedStation = stations.find((s) => s.id === selectedStationId);
  const selectedStationKpi = simulationResult?.kpis?.stations?.find(
    (s) => s.station_id === selectedStation?.station_id,
  );

  return (
    <aside className="w-96 border-l border-border bg-background flex flex-col overflow-hidden shrink-0">
      <Tabs defaultValue="overview" className="flex flex-col h-full">
        <TabsList className="bg-card border-b border-border rounded-none h-12 shrink-0">
          <TabsTrigger
            value="overview"
            className="flex-1 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="station"
            className="flex-1 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            Station Detail
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 m-0 space-y-4">
            {!simulationResult ? (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No simulation results yet
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Run a simulation to see KPIs
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <KPICard
                    icon={<Clock className="h-4 w-4" />}
                    title="Avg Wait Time"
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
                    title="Idle Inventory"
                    value={cityKpis?.idle_inventory_pct?.toFixed(1) || "0"}
                    unit="%"
                    baseline={baselineKpis?.idle_inventory_pct}
                    lowerIsBetter
                  />
                  <KPICard
                    icon={<Zap className="h-4 w-4" />}
                    title="Charger Util."
                    value={((cityKpis?.charger_utilization || 0) * 100).toFixed(
                      1,
                    )}
                    unit="%"
                    baseline={
                      baselineKpis?.charger_utilization
                        ? baselineKpis.charger_utilization * 100
                        : undefined
                    }
                    lowerIsBetter={false}
                  />
                  <KPICard
                    icon={<TrendingUp className="h-4 w-4" />}
                    title="Throughput"
                    value={cityKpis?.throughput?.toFixed(0) || "0"}
                    unit="swaps/h"
                    baseline={baselineKpis?.throughput}
                    lowerIsBetter={false}
                  />
                  <KPICard
                    icon={<DollarSign className="h-4 w-4" />}
                    title="Cost Proxy"
                    value={((cityKpis?.cost_proxy || 0) / 1000).toFixed(1)}
                    unit="K"
                    baseline={
                      baselineKpis?.cost_proxy
                        ? baselineKpis.cost_proxy / 1000
                        : undefined
                    }
                    lowerIsBetter
                  />
                </div>

                {/* Summary stats */}
                <Card className="bg-card border-border">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium text-foreground">
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Total Arrivals
                        </span>
                        <p className="text-foreground font-medium">
                          {cityKpis?.total_arrivals?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Lost Swaps
                        </span>
                        <p className="text-foreground font-medium">
                          {cityKpis?.total_lost?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comparison table (if baseline exists) */}
                {baselineKpis && (
                  <Card className="bg-card border-border">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-medium text-foreground">
                        Baseline Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left py-1">Metric</th>
                            <th className="text-right py-1">Baseline</th>
                            <th className="text-right py-1">Current</th>
                            <th className="text-right py-1">Change</th>
                          </tr>
                        </thead>
                        <tbody className="text-foreground">
                          <ComparisonRow
                            label="Wait Time"
                            baseline={baselineKpis.avg_wait_time}
                            current={cityKpis?.avg_wait_time || 0}
                            unit="min"
                            lowerIsBetter
                          />
                          <ComparisonRow
                            label="Lost %"
                            baseline={baselineKpis.lost_swaps_pct}
                            current={cityKpis?.lost_swaps_pct || 0}
                            unit="%"
                            lowerIsBetter
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
                )}
              </>
            )}
          </TabsContent>

          {/* Station Detail Tab */}
          <TabsContent value="station" className="p-4 m-0">
            {!selectedStation ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No station selected</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Click a station on the map
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-foreground">
                        {selectedStation.station_id}
                      </CardTitle>
                      {selectedStationKpi?.tier && (
                        <Badge
                          variant="outline"
                          className="border-primary/50 text-primary"
                        >
                          {selectedStationKpi.tier}
                        </Badge>
                      )}
                    </div>
                    {selectedStation.name && (
                      <p className="text-xs text-muted-foreground">
                        {selectedStation.name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Chargers
                        </span>
                        <p className="text-foreground font-medium">
                          {selectedStation.chargers}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Capacity
                        </span>
                        <p className="text-foreground font-medium">
                          {selectedStation.inventory_cap}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedStationKpi && (
                  <Card className="bg-card border-border">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-medium text-foreground">
                        Station KPIs
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">
                            Total Arrivals
                          </span>
                          <p className="text-foreground font-medium">
                            {selectedStationKpi.total_arrivals.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">
                            Successful Swaps
                          </span>
                          <p className="text-foreground font-medium">
                            {selectedStationKpi.successful_swaps.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">
                            Lost Swaps
                          </span>
                          <p className="text-destructive font-medium">
                            {selectedStationKpi.lost_swaps} (
                            {selectedStationKpi.lost_swaps_pct.toFixed(1)}%)
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">
                            Avg Wait Time
                          </span>
                          <p className="text-foreground font-medium">
                            {selectedStationKpi.avg_wait_time.toFixed(1)} min
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">
                            Charger Util.
                          </span>
                          <p className="text-foreground font-medium">
                            {(
                              selectedStationKpi.charger_utilization * 100
                            ).toFixed(1)}
                            %
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">
                            Avg Charged Inv.
                          </span>
                          <p className="text-foreground font-medium">
                            {selectedStationKpi.avg_charged_inventory.toFixed(
                              1,
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}

// KPI Card component
function KPICard({
  icon,
  title,
  value,
  unit,
  baseline,
  lowerIsBetter,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  unit: string;
  baseline?: number;
  lowerIsBetter: boolean;
}) {
  const currentValue = parseFloat(value);
  const change = baseline ? ((currentValue - baseline) / baseline) * 100 : null;
  const isImprovement = change
    ? lowerIsBetter
      ? change < 0
      : change > 0
    : null;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{title}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-semibold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {change !== null && (
          <div
            className={`text-xs mt-1 ${
              isImprovement ? "text-primary" : "text-destructive"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Comparison table row
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
  const change = ((current - baseline) / baseline) * 100;
  const isImprovement = lowerIsBetter ? change < 0 : change > 0;

  return (
    <tr className="border-t border-border">
      <td className="py-1.5">{label}</td>
      <td className="text-right py-1.5 text-muted-foreground">
        {baseline.toFixed(1)}
        {unit}
      </td>
      <td className="text-right py-1.5">
        {current.toFixed(1)}
        {unit}
      </td>
      <td
        className={`text-right py-1.5 ${
          isImprovement ? "text-primary" : "text-destructive"
        }`}
      >
        {change > 0 ? "+" : ""}
        {change.toFixed(1)}%
      </td>
    </tr>
  );
}
