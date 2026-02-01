import type {
  TokenResponse,
  Project,
  ProjectCreate,
  ProjectUpdate,
  Station,
  StationCreate,
  StationUpdate,
  Scenario,
  ScenarioCreate,
  SimulationResult,
  ApiError,
  CityKPI,
} from "@/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `HTTP error ${response.status}`,
      }));
      throw new Error(
        error.detail || `Request failed with status ${response.status}`,
      );
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  auth = {
    signup: (email: string, password: string): Promise<TokenResponse> =>
      this.request("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    login: (email: string, password: string): Promise<TokenResponse> =>
      this.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    logout: (): Promise<{ message: string }> =>
      this.request("/auth/logout", {
        method: "POST",
      }),
  };

  // Projects endpoints
  projects = {
    list: (): Promise<Project[]> => this.request("/projects"),

    get: (projectId: string): Promise<Project> =>
      this.request(`/projects/${projectId}`),

    create: (data: ProjectCreate): Promise<Project> =>
      this.request("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (projectId: string, data: ProjectUpdate): Promise<Project> =>
      this.request(`/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    runBaseline: (
      projectId: string,
    ): Promise<{ status: string; baseline_kpis: CityKPI; message: string }> =>
      this.request(`/projects/${projectId}/run-baseline`, {
        method: "POST",
      }),
  };

  // Stations endpoints (nested under projects)
  stations = {
    list: (projectId: string): Promise<Station[]> =>
      this.request(`/projects/${projectId}/stations`),

    create: (projectId: string, data: StationCreate): Promise<Station> =>
      this.request(`/projects/${projectId}/stations`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (
      projectId: string,
      stationId: string,
      data: StationUpdate,
    ): Promise<Station> =>
      this.request(`/projects/${projectId}/stations/${stationId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (
      projectId: string,
      stationId: string,
    ): Promise<{ message: string }> =>
      this.request(`/projects/${projectId}/stations/${stationId}`, {
        method: "DELETE",
      }),
  };

  // Scenarios endpoints (nested under projects)
  scenarios = {
    list: (projectId: string): Promise<Scenario[]> =>
      this.request(`/projects/${projectId}/scenarios`),

    get: (projectId: string, scenarioId: string): Promise<Scenario> =>
      this.request(`/projects/${projectId}/scenarios/${scenarioId}`),

    create: (projectId: string, data: ScenarioCreate): Promise<Scenario> =>
      this.request(`/projects/${projectId}/scenarios`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    run: (projectId: string, scenarioId: string): Promise<SimulationResult> =>
      this.request(`/projects/${projectId}/scenarios/${scenarioId}/run`, {
        method: "POST",
      }),
  };
}

export const api = new ApiClient();
export default api;
