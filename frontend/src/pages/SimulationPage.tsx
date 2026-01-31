import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setCurrentProject,
  setProjectsLoading,
} from "@/features/projectsSlice";
import {
  setStations,
  setStationsLoading,
  clearStations,
} from "@/features/stationsSlice";
import {
  setScenarios,
  setScenariosLoading,
  clearScenarios,
} from "@/features/scenariosSlice";
import { resetUI } from "@/features/uiSlice";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import LeftSidebar from "@/components/simulation/LeftSidebar";
import SimulationMap from "@/components/simulation/SimulationMap";
import RightSidebar from "@/components/simulation/RightSidebar";

export default function SimulationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentProject, loading: projectLoading } = useAppSelector(
    (state) => state.projects,
  );
  const { loading: stationsLoading } = useAppSelector(
    (state) => state.stations,
  );

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectData = async () => {
      dispatch(setProjectsLoading(true));
      dispatch(setStationsLoading(true));
      dispatch(setScenariosLoading(true));

      try {
        // Fetch project, stations, and scenarios in parallel
        const [project, dbStations, scenarios] = await Promise.all([
          api.projects.get(projectId),
          api.stations.list(projectId),
          api.scenarios.list(projectId),
        ]);

        dispatch(setCurrentProject(project));
        dispatch(setScenarios(scenarios));

        // If no stations in DB, sync baseline_config stations to database
        if (dbStations.length === 0 && project.baseline_config?.stations) {
          toast.info("Syncing baseline stations to database...");

          try {
            // Create all baseline stations in database
            const createdStations = await Promise.all(
              project.baseline_config.stations.map((s) =>
                api.stations.create(projectId, {
                  station_id: s.station_id,
                  name: `${s.tier.charAt(0).toUpperCase() + s.tier.slice(1)} Tier Station`,
                  latitude: s.lat,
                  longitude: s.lon,
                  chargers: s.chargers,
                  inventory_cap: s.inventory_capacity,
                }),
              ),
            );
            dispatch(setStations(createdStations));
            toast.success(`Synced ${createdStations.length} baseline stations`);
          } catch (syncError) {
            // If sync fails, show stations as read-only baseline stations
            console.warn("Failed to sync baseline stations:", syncError);
            const baselineStations = project.baseline_config.stations.map(
              (s, index) => ({
                id: `baseline-${index}`,
                project_id: projectId,
                station_id: s.station_id,
                name: `${s.tier.charAt(0).toUpperCase() + s.tier.slice(1)} Tier Station`,
                latitude: s.lat,
                longitude: s.lon,
                chargers: s.chargers,
                bays: s.inventory_capacity,
                inventory_cap: s.inventory_capacity,
                active: true,
                created_at: project.created_at,
                updated_at: project.updated_at,
                isBaseline: true, // Mark as read-only
              }),
            );
            dispatch(setStations(baselineStations));
            toast.warning("Baseline stations loaded (read-only mode)");
          }
        } else {
          dispatch(setStations(dbStations));
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load project",
        );
        navigate("/dashboard");
      }
    };

    fetchProjectData();

    // Cleanup on unmount
    return () => {
      dispatch(clearStations());
      dispatch(clearScenarios());
      dispatch(resetUI());
    };
  }, [projectId, dispatch, navigate]);

  const isLoading = projectLoading || stationsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentProject) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 shrink-0 shadow-sm z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="h-6 w-px bg-border" />
        <h1 className="text-lg font-semibold text-foreground truncate">
          {currentProject.name}
        </h1>
      </header>

      {/* Main Layout: Three Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Controls */}
        <LeftSidebar />

        {/* Center - Map */}
        <main className="flex-1 relative">
          <SimulationMap />
        </main>

        {/* Right Sidebar - Dashboard */}
        <RightSidebar />
      </div>
    </div>
  );
}
