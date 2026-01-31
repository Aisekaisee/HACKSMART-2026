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
    <aside className="w-96 border-l border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden shrink-0">
      <Tabs defaultValue="overview" className="flex flex-col h-full">
        <TabsList className="bg-slate-800/50 border-b border-slate-700 rounded-none h-12 shrink-0">
          <TabsTrigger
            value="overview"
            className="flex-1 data-[state=active]:bg-slate-700"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="station"
            className="flex-1 data-[state=active]:bg-slate-700"
          >
            Station Detail
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 m-0 space-y-4">
            {!simulationResult ? (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No simulation results yet</p>
                <p className="text-slate-500 text-sm mt-1">
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
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium text-slate-300">
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Total Arrivals</span>
                        <p className="text-slate-200 font-medium">
                          {cityKpis?.total_arrivals?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Lost Swaps</span>
                        <p className="text-slate-200 font-medium">
                          {cityKpis?.total_lost?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comparison table (if baseline exists) */}
                {baselineKpis && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-medium text-slate-300">
                        Baseline Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-left py-1">Metric</th>
                            <th className="text-right py-1">Baseline</th>
                            <th className="text-right py-1">Current</th>
                            <th className="text-right py-1">Change</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-300">
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
                <p className="text-slate-400">No station selected</p>
                <p className="text-slate-500 text-sm mt-1">
                  Click a station on the map
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-white">
                        {selectedStation.station_id}
                      </CardTitle>
                      {selectedStationKpi?.tier && (
                        <Badge
                          variant="outline"
                          className="border-blue-500/50 text-blue-400"
                        >
                          {selectedStationKpi.tier}
                        </Badge>
                      )}
                    </div>
                    {selectedStation.name && (
                      <p className="text-xs text-slate-500">
                        {selectedStation.name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500 text-xs">Chargers</span>
                        <p className="text-slate-200 font-medium">
                          {selectedStation.chargers}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Bays</span>
                        <p className="text-slate-200 font-medium">
                          {selectedStation.bays}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Capacity</span>
                        <p className="text-slate-200 font-medium">
                          {selectedStation.inventory_cap}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedStationKpi && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-medium text-slate-300">
                        Station KPIs
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500 text-xs">
                            Total Arrivals
                          </span>
                          <p className="text-slate-200 font-medium">
                            {selectedStationKpi.total_arrivals.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">
                            Successful Swaps
                          </span>
                          <p className="text-slate-200 font-medium">
                            {selectedStationKpi.successful_swaps.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">
                            Lost Swaps
                          </span>
                          <p className="text-red-400 font-medium">
                            {selectedStationKpi.lost_swaps} (
                            {selectedStationKpi.lost_swaps_pct.toFixed(1)}%)
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">
                            Avg Wait Time
                          </span>
                          <p className="text-slate-200 font-medium">
                            {selectedStationKpi.avg_wait_time.toFixed(1)} min
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">
                            Charger Util.
                          </span>
                          <p className="text-slate-200 font-medium">
                            {(
                              selectedStationKpi.charger_utilization * 100
                            ).toFixed(1)}
                            %
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">
                            Avg Charged Inv.
                          </span>
                          <p className="text-slate-200 font-medium">
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
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-slate-400 mb-1">
          {icon}
          <span className="text-xs">{title}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-semibold text-white">{value}</span>
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
        {change !== null && (
          <div
            className={`text-xs mt-1 ${
              isImprovement ? "text-green-400" : "text-red-400"
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
    <tr className="border-t border-slate-700/50">
      <td className="py-1.5">{label}</td>
      <td className="text-right py-1.5 text-slate-500">
        {baseline.toFixed(1)}
        {unit}
      </td>
      <td className="text-right py-1.5">
        {current.toFixed(1)}
        {unit}
      </td>
      <td
        className={`text-right py-1.5 ${
          isImprovement ? "text-green-400" : "text-red-400"
        }`}
      >
        {change > 0 ? "+" : ""}
        {change.toFixed(1)}%
      </td>
    </tr>
  );
}
