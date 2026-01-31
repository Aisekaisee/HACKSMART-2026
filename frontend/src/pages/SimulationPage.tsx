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
        const [project, stations, scenarios] = await Promise.all([
          api.projects.get(projectId),
          api.stations.list(projectId),
          api.scenarios.list(projectId),
        ]);

        dispatch(setCurrentProject(project));
        dispatch(setStations(stations));
        dispatch(setScenarios(scenarios));
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!currentProject) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-4 gap-4 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="h-6 w-px bg-slate-700" />
        <h1 className="text-lg font-semibold text-white truncate">
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
