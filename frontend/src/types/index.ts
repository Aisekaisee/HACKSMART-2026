// User & Auth Types
export interface User {
  id: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  baseline_valid: boolean;
  baseline_kpis?: CityKPI;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  baseline_config?: object;
}

// Station Types
export interface Station {
  id: string;
  project_id: string;
  station_id: string; // Business key like "STATION_07"
  name?: string;
  latitude: number;
  longitude: number;
  chargers: number;
  bays: number;
  inventory_cap: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StationCreate {
  station_id: string;
  name?: string;
  latitude: number;
  longitude: number;
  chargers?: number;
  bays?: number;
  inventory_cap?: number;
}

export interface StationUpdate {
  station_id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  chargers?: number;
  bays?: number;
  inventory_cap?: number;
  active?: boolean;
}

// Scenario & Intervention Types
export type InterventionType =
  | "weather_demand"
  | "event_demand"
  | "replenishment_policy"
  | "modify_station"
  | "add_station"
  | "remove_station";

export interface InterventionItem {
  type: InterventionType;
  params: Record<string, unknown>;
}

export interface Scenario {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: "draft" | "running" | "completed" | "failed";
  duration_hours: number;
  interventions: InterventionItem[];
  result_kpis?: SimulationKPIs;
  created_at: string;
  updated_at: string;
}

export interface ScenarioCreate {
  name: string;
  description?: string;
  interventions: InterventionItem[];
  duration_hours?: number;
}

// KPI Types
export interface CityKPI {
  avg_wait_time: number;
  lost_swaps_pct: number;
  total_lost: number;
  total_arrivals: number;
  charger_utilization: number;
  idle_inventory_pct: number;
  throughput: number;
  cost_proxy: number;
}

export interface StationKPI {
  station_id: string;
  tier: string;
  total_arrivals: number;
  successful_swaps: number;
  lost_swaps: number;
  lost_swaps_pct: number;
  avg_wait_time: number;
  charger_utilization: number;
  avg_charged_inventory: number;
}

export interface SimulationKPIs {
  city_kpis: CityKPI;
  stations: StationKPI[];
}

// Simulation Types
export interface TimelineFrame {
  hour: number;
  stations: Record<
    string,
    {
      charged_inventory: number;
      queue_length: number;
      arrivals: number;
      swaps: number;
      lost: number;
    }
  >;
}

export interface SimulationResult {
  scenario_id: string;
  status: "running" | "completed" | "failed";
  kpis?: SimulationKPIs;
  timeline?: TimelineFrame[];
  error?: string;
}

// API Error
export interface ApiError {
  detail: string;
}
