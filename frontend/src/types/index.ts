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
export interface BaselineStation {
  station_id: string;
  tier: string;
  lat: number;
  lon: number;
  chargers: number;
  inventory_capacity: number;
  initial_charged?: number;
}

export interface BaselineConfig {
  stations?: BaselineStation[];
  demand?: object;
  operations?: object;
  simulation_duration?: number;
  random_seed?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  baseline_config?: BaselineConfig;
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
export type StationTier = "high" | "medium" | "low";

export interface Station {
  id: string;
  project_id: string;
  station_id: string; // Business key like "STATION_07"
  name?: string;
  latitude: number;
  longitude: number;
  chargers: number;
  inventory_cap: number;
  tier?: StationTier;
  active: boolean;
  created_at: string;
  updated_at: string;
  isBaseline?: boolean; // True if loaded from baseline_config (not persisted to DB)
}

export interface StationCreate {
  station_id: string;
  name?: string;
  latitude: number;
  longitude: number;
  chargers?: number;
  inventory_cap?: number;
  tier?: StationTier;
}

export interface StationUpdate {
  station_id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  chargers?: number;
  inventory_cap?: number;
  tier?: StationTier;
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
  /** Average wait time in minutes */
  avg_wait_time: number;
  /** Lost swaps as percentage (0-100) */
  lost_swaps_pct: number;
  /** Total number of lost/rejected swaps */
  total_lost: number;
  /** Total number of swap requests */
  total_arrivals: number;
  /** Charger utilization as decimal (0-1), multiply by 100 for percentage */
  charger_utilization: number;
  /** Average charged inventory as percentage of capacity */
  idle_inventory_pct: number;
  /** Successful swaps per hour */
  throughput: number;
  /** Weighted cost score (lower is better): 0.5*wait + 2*lost% + 10*(1-util) */
  cost_proxy: number;
}

export interface StationKPI {
  station_id: string;
  tier: string;
  total_arrivals: number;
  successful_swaps: number;
  lost_swaps: number;
  /** Lost swaps as percentage (0-100) */
  lost_swaps_pct: number;
  /** Average wait time in minutes */
  avg_wait_time: number;
  /** Charger utilization as decimal (0-1), multiply by 100 for percentage */
  charger_utilization: number;
  /** Average number of charged batteries in inventory */
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

// KPI Comparison (baseline vs scenario)
export interface KPIComparison {
  baseline: CityKPI;
  scenario: CityKPI;
  delta: {
    avg_wait_time: number;
    lost_swaps_pct: number;
    charger_utilization: number;
    throughput: number;
    idle_inventory_pct: number;
    cost_proxy: number;
  };
}

// Financial/Cost Types (BatterySmart Pricing)
export interface CapitalCosts {
  chargers: number;
  inventory: number;
  total: number;
  daily_amortized: number;
}

export interface OperationalBreakdown {
  electricity: number;
  labor: number;
  maintenance: number;
  rent: number;
  swap_operations: number;
  replenishment: number;
}

export interface OperationalCosts {
  total: number;
  breakdown: OperationalBreakdown;
}

export interface RevenueBreakdown {
  base_swap: number; // ₹170 × successful_swaps
  service_charge: number; // ₹40 × successful_swaps
  total: number;
  per_swap: number; // ₹210
}

export interface OpportunityCosts {
  lost_revenue: number;
  lost_swaps: number;
}

export interface PerSwapEconomics {
  revenue: number; // ₹210
  cost: number; // Operational cost per swap
  margin: number; // Profit per swap
}

export interface FinancialSummary {
  successful_swaps: number;
  lost_swaps: number;
  gross_profit: number;
  profit_margin_pct: number;
  net_operational_profit: number;
  total_cost: number;
}

export interface FinancialData {
  capital: CapitalCosts;
  operational_24hr: OperationalCosts;
  revenue: RevenueBreakdown;
  opportunity: OpportunityCosts;
  per_swap_economics: PerSwapEconomics;
  summary: FinancialSummary;
}

export interface SimulationResult {
  scenario_id: string;
  status: "running" | "completed" | "failed";
  kpis?: SimulationKPIs;
  timeline?: TimelineFrame[];
  costs?: FinancialData;
  error?: string;
  comparison?: KPIComparison | null;
}

// API Error
export interface ApiError {
  detail: string;
}
