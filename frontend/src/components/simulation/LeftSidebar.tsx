import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { openModal, closeModal } from "@/features/uiSlice";
import { setCurrentProject } from "@/features/projectsSlice";
import {
  addPendingIntervention,
  removePendingIntervention,
  clearPendingInterventions,
  addScenario,
  setSimulationResult,
  setSimulationRunning,
} from "@/features/scenariosSlice";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Cloud,
  Calendar,
  RefreshCcw,
  Play,
  Loader2,
  X,
  ChevronDown,
  Zap,
  CheckCircle2,
  Settings,
  Layers,
} from "lucide-react";
import AddStationModal from "./AddStationModal";
import EditStationModal from "./EditStationModal";
import RemoveStationModal from "./RemoveStationModal";
import InterventionForm from "./InterventionForm";
import type { InterventionItem, InterventionType } from "@/types";

export default function LeftSidebar() {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();
  const { stations } = useAppSelector((state) => state.stations);
  const { pendingInterventions, running } = useAppSelector(
    (state) => state.scenarios,
  );
  const { currentProject } = useAppSelector((state) => state.projects);
  const modals = useAppSelector((state) => state.ui.modals);
  const { pickedLocation, pickingForModal, isPickingLocation } = useAppSelector(
    (state) => state.ui,
  );

  const [duration, setDuration] = useState("24");
  const [runningBaseline, setRunningBaseline] = useState(false);
  const [showInterventionForm, setShowInterventionForm] = useState(false);
  const [interventionType, setInterventionType] =
    useState<InterventionType | null>(null);

  const hasBaselineKPIs = !!currentProject?.baseline_kpis;

  useEffect(() => {
    if (pickedLocation && !isPickingLocation) {
      if (pickingForModal === "addStation") {
        dispatch(openModal("addStation"));
      } else if (pickingForModal === "editStation") {
        dispatch(openModal("editStation"));
      }
    }
  }, [pickedLocation, pickingForModal, isPickingLocation, dispatch]);

  const handleAddIntervention = (type: InterventionType) => {
    setInterventionType(type);
    setShowInterventionForm(true);
  };

  const handleInterventionSubmit = (intervention: InterventionItem) => {
    dispatch(addPendingIntervention(intervention));
    setShowInterventionForm(false);
    setInterventionType(null);
    toast.success("Intervention added");
  };

  const handleRunBaseline = async () => {
    if (!projectId) return;

    setRunningBaseline(true);
    try {
      const result = await api.projects.runBaseline(projectId);
      if (currentProject) {
        dispatch(
          setCurrentProject({
            ...currentProject,
            baseline_kpis: result.baseline_kpis,
          }),
        );
      }
      toast.success(
        "Baseline simulation completed! You can now run scenarios to compare.",
      );
    } catch (error) {
      console.error("Baseline simulation failed:", error);
      toast.error("Failed to run baseline simulation");
    } finally {
      setRunningBaseline(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!projectId) return;

    dispatch(setSimulationRunning(true));
    try {
      const scenario = await api.scenarios.create(projectId, {
        name: `Simulation ${new Date().toLocaleString()}`,
        interventions: pendingInterventions,
        duration_hours: parseInt(duration),
      });

      dispatch(addScenario(scenario));

      const result = await api.scenarios.run(projectId, scenario.id);

      if (result.status === "failed") {
        toast.error(result.error || "Simulation failed");
        dispatch(setSimulationRunning(false));
        return;
      }

      dispatch(setSimulationResult(result));
      dispatch(clearPendingInterventions());
      toast.success("Simulation completed!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Simulation failed");
    } finally {
      dispatch(setSimulationRunning(false));
    }
  };

  const getInterventionLabel = (intervention: InterventionItem) => {
    const params = intervention.params as Record<string, unknown>;
    switch (intervention.type) {
      case "weather_demand":
        return `Weather: ${params.condition || "Custom"}`;
      case "event_demand":
        return `Event: ${params.event_name || "Custom"}`;
      case "replenishment_policy":
        return `Replenishment: ${params.policy || "Custom"}`;
      default:
        return intervention.type;
    }
  };

  return (
    <aside className="w-96 border-r border-border bg-background flex flex-col h-full overflow-hidden shadow-xl z-10 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Configuration
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Setup simulation parameters and scenarios
        </p>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-card/30">
        <Tabs defaultValue="stations" className="h-full flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stations" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Stations
              </TabsTrigger>
              <TabsTrigger
                value="interventions"
                className="flex items-center gap-2"
              >
                <Layers className="h-4 w-4" /> Scenarios
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Stations Tab */}
          <TabsContent
            value="stations"
            className="flex-1 p-4 space-y-4 data-[state=inactive]:hidden"
          >
            <Card className="bg-card border-border shadow-none">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Active Stations
                  </span>
                  <Badge variant="secondary" className="bg-secondary/50">
                    {stations.length}
                  </Badge>
                </div>

                {stations.some(
                  (s) => s.id.startsWith("baseline-") || s.isBaseline,
                ) && (
                  <div className="text-xs text-amber-400 bg-amber-400/10 p-3 rounded-lg border border-amber-400/20 flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <span className="leading-5">
                      Baseline stations are read-only used for comparison. Add
                      new stations to modify network.
                    </span>
                  </div>
                )}

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {stations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                      No stations configured
                    </div>
                  ) : (
                    stations.map((station) => (
                      <div
                        key={station.id}
                        className="group flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground flex items-center gap-2">
                            {station.station_id}
                            {(station.id.startsWith("baseline-") ||
                              station.isBaseline) && (
                              <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded">
                                Base
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {station.latitude.toFixed(3)},{" "}
                            {station.longitude.toFixed(3)}
                          </span>
                        </div>
                        <div className="text-xs font-mono bg-background/50 px-2 py-1 rounded text-foreground">
                          {station.chargers} chgs
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => dispatch(openModal("addStation"))}
                  >
                    <Plus className="h-3 w-3 mr-1.5" />
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => dispatch(openModal("editStation"))}
                    disabled={stations.length === 0}
                  >
                    <Edit className="h-3 w-3 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    onClick={() => dispatch(openModal("removeStation"))}
                    disabled={stations.length === 0}
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    Del
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interventions Tab */}
          <TabsContent
            value="interventions"
            className="flex-1 p-4 space-y-4 data-[state=inactive]:hidden"
          >
            <div className="space-y-4">
              {/* Controls */}
              <Card className="bg-card border-border shadow-none">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Duration
                    </label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 hours (Day)</SelectItem>
                        <SelectItem value="168">1 week (168h)</SelectItem>
                        <SelectItem value="720">1 month (720h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Interventions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active Interventions
                  </label>
                  <Badge variant="outline" className="text-xs">
                    {pendingInterventions.length}
                  </Badge>
                </div>

                {pendingInterventions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg bg-card/50">
                    No interventions added
                    <p className="text-xs opacity-60 mt-1">
                      Add events to simulate demand spikes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingInterventions.map((intervention, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-card border border-border shadow-sm group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-md ${
                              intervention.type === "weather_demand"
                                ? "bg-blue-500/10 text-blue-500"
                                : intervention.type === "event_demand"
                                  ? "bg-purple-500/10 text-purple-500"
                                  : "bg-orange-500/10 text-orange-500"
                            }`}
                          >
                            {intervention.type === "weather_demand" && (
                              <Cloud className="h-4 w-4" />
                            )}
                            {intervention.type === "event_demand" && (
                              <Calendar className="h-4 w-4" />
                            )}
                            {intervention.type === "replenishment_policy" && (
                              <RefreshCcw className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {getInterventionLabel(intervention)}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {intervention.type.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            dispatch(removePendingIntervention(index))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add form area */}
              {showInterventionForm && interventionType ? (
                <div className="rounded-lg border border-border bg-card p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-sm">
                      Configure Intervention
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInterventionForm(false)}
                      className="h-6 w-6 p-0 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <InterventionForm
                    type={interventionType}
                    onSubmit={handleInterventionSubmit}
                    onCancel={() => {
                      setShowInterventionForm(false);
                      setInterventionType(null);
                    }}
                  />
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Intervention
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => handleAddIntervention("weather_demand")}
                    >
                      <Cloud className="h-4 w-4 mr-2 text-blue-500" />
                      Weather Event
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAddIntervention("event_demand")}
                    >
                      <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                      Special Event
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleAddIntervention("replenishment_policy")
                      }
                    >
                      <RefreshCcw className="h-4 w-4 mr-2 text-orange-500" />
                      Replenishment Policy
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Fixed Footer Actions */}
      <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md space-y-3">
        {/* Baseline Status */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-muted-foreground">Baseline Status:</span>
          {hasBaselineKPIs ? (
            <span className="flex items-center text-green-500 font-medium">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
            </span>
          ) : (
            <span className="text-amber-500 font-medium">Not Run</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full text-xs font-semibold h-10"
            onClick={handleRunBaseline}
            disabled={runningBaseline || stations.length === 0}
          >
            {runningBaseline ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Zap className="h-3 w-3 mr-1 text-amber-500" />
            )}
            Run Baseline
          </Button>

          <Button
            size="lg"
            className="w-full text-xs font-semibold h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            onClick={handleRunSimulation}
            disabled={running || stations.length === 0}
          >
            {running ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Play className="h-3 w-3 mr-1 fill-current" />
            )}
            Simulate
          </Button>
        </div>
      </div>

      {/* Station Modals */}
      <AddStationModal
        open={modals.addStation}
        onOpenChange={(open: boolean) =>
          dispatch(open ? openModal("addStation") : closeModal("addStation"))
        }
      />
      <EditStationModal
        open={modals.editStation}
        onOpenChange={(open: boolean) =>
          dispatch(open ? openModal("editStation") : closeModal("editStation"))
        }
      />
      <RemoveStationModal
        open={modals.removeStation}
        onOpenChange={(open: boolean) =>
          dispatch(
            open ? openModal("removeStation") : closeModal("removeStation"),
          )
        }
      />
    </aside>
  );
}
