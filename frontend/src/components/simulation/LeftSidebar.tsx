import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { openModal } from "@/features/uiSlice";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  const modals = useAppSelector((state) => state.ui.modals);

  const [duration, setDuration] = useState("24");
  const [showInterventionForm, setShowInterventionForm] = useState(false);
  const [interventionType, setInterventionType] =
    useState<InterventionType | null>(null);

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

  const handleRunSimulation = async () => {
    if (!projectId) return;

    dispatch(setSimulationRunning(true));
    try {
      // Create scenario with interventions
      const scenario = await api.scenarios.create(projectId, {
        name: `Simulation ${new Date().toLocaleString()}`,
        interventions: pendingInterventions,
        duration_hours: parseInt(duration),
      });

      dispatch(addScenario(scenario));

      // Run the simulation
      const result = await api.scenarios.run(projectId, scenario.id);
      dispatch(setSimulationResult(result));
      dispatch(clearPendingInterventions());
      toast.success("Simulation completed!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Simulation failed");
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
    <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden shrink-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Station Management */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Station Management
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="text-sm text-slate-400">
              {stations.length} station{stations.length !== 1 ? "s" : ""}{" "}
              configured
            </div>

            {/* Station list - scrollable */}
            {stations.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {stations.map((station) => (
                  <div
                    key={station.id}
                    className="text-xs text-slate-500 py-1 px-2 rounded bg-slate-800/50 flex justify-between items-center"
                  >
                    <span>{station.station_id}</span>
                    <span className="text-slate-600">
                      ({station.latitude.toFixed(2)},{" "}
                      {station.longitude.toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => dispatch(openModal("addStation"))}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => dispatch(openModal("editStation"))}
                disabled={stations.length === 0}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => dispatch(openModal("removeStation"))}
                disabled={stations.length === 0}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-slate-700" />

        {/* Interventions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Interventions
              </span>
              <Badge
                variant="outline"
                className="border-slate-600 text-slate-400"
              >
                {pendingInterventions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Pending interventions list */}
            {pendingInterventions.length > 0 && (
              <div className="space-y-2">
                {pendingInterventions.map((intervention, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded bg-slate-800/80 border border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      {intervention.type === "weather_demand" && (
                        <Cloud className="h-3 w-3 text-blue-400" />
                      )}
                      {intervention.type === "event_demand" && (
                        <Calendar className="h-3 w-3 text-purple-400" />
                      )}
                      {intervention.type === "replenishment_policy" && (
                        <RefreshCcw className="h-3 w-3 text-green-400" />
                      )}
                      <span className="text-xs text-slate-300">
                        {getInterventionLabel(intervention)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-slate-500 hover:text-red-400"
                      onClick={() => dispatch(removePendingIntervention(index))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Intervention form */}
            {showInterventionForm && interventionType && (
              <InterventionForm
                type={interventionType}
                onSubmit={handleInterventionSubmit}
                onCancel={() => {
                  setShowInterventionForm(false);
                  setInterventionType(null);
                }}
              />
            )}

            {/* Add intervention dropdown */}
            {!showInterventionForm && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Intervention
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700">
                  <DropdownMenuItem
                    className="text-slate-300 focus:bg-slate-700 cursor-pointer"
                    onClick={() => handleAddIntervention("weather_demand")}
                  >
                    <Cloud className="h-4 w-4 mr-2 text-blue-400" />
                    Weather Event
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-slate-300 focus:bg-slate-700 cursor-pointer"
                    onClick={() => handleAddIntervention("event_demand")}
                  >
                    <Calendar className="h-4 w-4 mr-2 text-purple-400" />
                    Special Event
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-slate-300 focus:bg-slate-700 cursor-pointer"
                    onClick={() =>
                      handleAddIntervention("replenishment_policy")
                    }
                  >
                    <RefreshCcw className="h-4 w-4 mr-2 text-green-400" />
                    Replenishment Policy
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardContent>
        </Card>

        <Separator className="bg-slate-700" />

        {/* Simulation Controls */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Play className="h-4 w-4" />
              Simulation Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="24" className="text-slate-300">
                    24 hours
                  </SelectItem>
                  <SelectItem value="168" className="text-slate-300">
                    1 week (168h)
                  </SelectItem>
                  <SelectItem value="720" className="text-slate-300">
                    1 month (720h)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleRunSimulation}
              disabled={running || stations.length === 0}
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Simulation...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>

            {stations.length === 0 && (
              <p className="text-xs text-slate-500 text-center">
                Add at least one station to run a simulation
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Station Modals */}
      <AddStationModal
        open={modals.addStation}
        onOpenChange={(open: boolean) =>
          open
            ? dispatch(openModal("addStation"))
            : dispatch({ type: "ui/closeModal", payload: "addStation" })
        }
      />
      <EditStationModal
        open={modals.editStation}
        onOpenChange={(open: boolean) =>
          open
            ? dispatch(openModal("editStation"))
            : dispatch({ type: "ui/closeModal", payload: "editStation" })
        }
      />
      <RemoveStationModal
        open={modals.removeStation}
        onOpenChange={(open: boolean) =>
          open
            ? dispatch(openModal("removeStation"))
            : dispatch({ type: "ui/closeModal", payload: "removeStation" })
        }
      />
    </aside>
  );
}
