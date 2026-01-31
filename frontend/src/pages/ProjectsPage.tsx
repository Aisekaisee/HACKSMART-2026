import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setProjects,
  addProject,
  setProjectsLoading,
} from "@/features/projectsSlice";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Battery,
  Plus,
  LogOut,
  Loader2,
  FolderOpen,
  Calendar,
} from "lucide-react";
import type { ProjectCreate } from "@/types";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const { projects, loading } = useAppSelector((state) => state.projects);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState<ProjectCreate>({
    name: "",
    description: "",
  });

  const canCreateProject = user?.role === "admin" || user?.role === "analyst";

  useEffect(() => {
    const fetchProjects = async () => {
      dispatch(setProjectsLoading(true));
      try {
        const data = await api.projects.list();
        dispatch(setProjects(data));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch projects",
        );
      }
    };
    fetchProjects();
  }, [dispatch]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setCreating(true);
    try {
      const project = await api.projects.create(newProject);
      dispatch(addProject(project));
      toast.success("Project created successfully");
      setCreateDialogOpen(false);
      setNewProject({ name: "", description: "" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create project",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Battery className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold text-white">SwapSim</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">{user?.email}</span>
              <Badge
                variant="outline"
                className="border-blue-500/50 text-blue-400"
              >
                {user?.role}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Projects</h1>
            <p className="text-slate-400 mt-1">
              Manage your simulation projects and scenarios
            </p>
          </div>

          {canCreateProject && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Create New Project
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300">
                      Project Name
                    </Label>
                    <Input
                      id="name"
                      value={newProject.name}
                      onChange={(e) =>
                        setNewProject((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="My Simulation Project"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-slate-300">
                      Description (optional)
                    </Label>
                    <Input
                      id="description"
                      value={newProject.description}
                      onChange={(e) =>
                        setNewProject((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="A brief description of this project"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCreateDialogOpen(false)}
                      className="text-slate-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={creating}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Project"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400">
              No projects yet
            </h3>
            <p className="text-slate-500 mt-2">
              {canCreateProject
                ? "Create your first project to get started"
                : "No projects available to view"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="bg-slate-900/50 border-slate-800 hover:border-blue-500/50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-white group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </CardTitle>
                    {project.baseline_valid && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Validated
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-slate-400">
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
