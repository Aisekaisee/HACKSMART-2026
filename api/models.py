from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================
# AUTH MODELS
# ============================================================

class SignUpRequest(BaseModel):
    """Request model for user signup."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6,
                          description="Password (min 6 characters)")


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class TokenResponse(BaseModel):
    """Response model for authentication tokens."""
    access_token: str
    refresh_token: str
    user_id: str
    role: str


# ============================================================
# PROJECT MODELS
# ============================================================

class ProjectCreate(BaseModel):
    """Request model for creating a new project."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    """Request model for updating a project (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    baseline_config: Optional[Dict[str, Any]] = None


class ProjectOut(BaseModel):
    """Response model for project data."""
    id: str
    name: str
    description: Optional[str] = None
    baseline_valid: bool = False
    baseline_kpis: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


# ============================================================
# STATION MODELS
# ============================================================

class StationCreate(BaseModel):
    """Request model for creating a station."""
    station_id: str = Field(..., description="Business key like 'STATION_07'")
    name: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    chargers: int = Field(default=5, ge=1, le=50)
    inventory_cap: int = Field(default=100, ge=1)
    tier: Optional[str] = Field(default=None, pattern="^(high|medium|low)$",
                                description="Station tier: high, medium, or low. If not provided, computed from chargers.")


class StationUpdate(BaseModel):
    """Request model for updating a station (all fields optional)."""
    station_id: Optional[str] = None
    name: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    chargers: Optional[int] = Field(None, ge=1, le=50)
    inventory_cap: Optional[int] = Field(None, ge=1)
    tier: Optional[str] = Field(None, pattern="^(high|medium|low)$")
    active: Optional[bool] = None


class StationOut(BaseModel):
    """Response model for station data."""
    id: str
    project_id: str
    station_id: str
    name: Optional[str] = None
    latitude: float
    longitude: float
    chargers: int
    inventory_cap: int
    tier: Optional[str] = None
    active: bool = True
    created_at: datetime
    updated_at: datetime


# ============================================================
# SCENARIO MODELS
# ============================================================

class InterventionItem(BaseModel):
    """A single intervention in a scenario."""
    type: str = Field(..., description="Intervention type: weather_demand, event_demand, replenishment_policy, etc.")
    params: Dict[str, Any] = Field(
        default_factory=dict, description="Type-specific parameters")


class ScenarioCreate(BaseModel):
    """Request model for creating a scenario."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    interventions: List[InterventionItem] = Field(default_factory=list)
    duration_hours: int = Field(default=24, ge=1, le=744)  # Max 31 days


class ScenarioUpdate(BaseModel):
    """Request model for updating a scenario (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    interventions: Optional[List[InterventionItem]] = None
    duration_hours: Optional[int] = Field(None, ge=1, le=744)


class ScenarioOut(BaseModel):
    """Response model for scenario data."""
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    status: str = "draft"
    duration_hours: int = 24
    interventions: List[InterventionItem] = []
    result_kpis: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


# ============================================================
# SIMULATION MODELS
# ============================================================

class SimulationRunResponse(BaseModel):
    """Response model for simulation run results."""
    scenario_id: str
    status: str  # "running", "completed", "failed"
    kpis: Optional[Dict[str, Any]] = None
    timeline: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    # Comparison with baseline KPIs
    comparison: Optional[Dict[str, Any]] = None


class BaselineRunResponse(BaseModel):
    """Response model for baseline simulation run."""
    status: str
    baseline_kpis: Dict[str, Any]
    message: str


# ============================================================
# VALIDATION MODELS
# ============================================================

class BaselineValidationResponse(BaseModel):
    """Response model for baseline validation results."""
    r_squared: float
    mape: float  # 0-100 scale
    rmse: float
    passed: bool
    per_station: Optional[Dict[str, Any]] = None
    thresholds: Optional[Dict[str, Any]] = None


# ============================================================
# LEGACY MODELS (preserved for backward compatibility)
# ============================================================

class Station(BaseModel):
    """Legacy station model for simulation config."""
    station_id: str
    tier: str = Field(pattern="^(high|medium|low)$")
    chargers: int = Field(ge=0)
    inventory_capacity: int = Field(gt=0)
    lat: float
    lon: float
    initial_charged: Optional[int] = None


class Demand(BaseModel):
    """Demand configuration for simulation."""
    base_rates: Dict[str, float]
    time_multipliers: Dict[int, float]
    scenario_multiplier: float = 1.0


class Operations(BaseModel):
    """Operational parameters for simulation."""
    swap_duration: float = 2.0
    charge_duration: float = 210.0
    replenishment_threshold: float = 0.2
    replenishment_amount: int = 10
    replenishment_delay: float = 30.0


class BaselineConfig(BaseModel):
    """Complete baseline configuration for simulation."""
    stations: List[Station]
    demand: Demand
    operations: Operations
    simulation_duration: float = 1440.0
    random_seed: Optional[int] = 42


class ScenarioConfig(BaseModel):
    """Legacy scenario config model."""
    name: str
    description: str = ""
    add_stations: List[Station] = []
    remove_station_ids: List[str] = []
    modify_stations: Dict[str, Dict[str, Any]] = {}
    demand_multiplier: Optional[float] = None
    operations_override: Dict[str, Any] = {}

    class Config:
        arbitrary_types_allowed = True


# --- KPI Response Models ---

class StationKPI(BaseModel):
    """KPI data for a single station."""
    station_id: str
    tier: str
    total_arrivals: int
    successful_swaps: int
    lost_swaps: int
    lost_swaps_pct: float
    avg_wait_time: float
    charger_utilization: float
    avg_charged_inventory: float


class CityKPI(BaseModel):
    """City-level aggregated KPIs."""
    avg_wait_time: float
    lost_swaps_pct: float
    total_lost: int
    total_arrivals: int
    charger_utilization: float
    idle_inventory_pct: float
    throughput: float
    cost_proxy: float


class KPISummary(BaseModel):
    """Combined KPI summary with city and station data."""
    city_kpis: CityKPI
    stations: List[StationKPI]


# --- Time-series models for playback visualization ---

class StationSnapshot(BaseModel):
    """Snapshot of station state at a point in time."""
    station_id: str
    charged_inventory: int
    depleted_inventory: int
    queue_length: int
    total_arrivals: int
    successful_swaps: int
    rejected_swaps: int


class HourlySnapshot(BaseModel):
    """Hourly snapshot containing all stations."""
    hour: int
    time_minutes: float
    stations: List[StationSnapshot]


# --- Timeline recorder models for video-scrubber style playback ---

class TimelineStationSnapshot(BaseModel):
    """Snapshot of a single station at a point in time."""
    station_id: str
    timestamp_min: float
    queue_length: int
    batteries_available: int
    chargers_in_use: int
    swaps_completed: int
    swaps_lost: int


class TimelineFrame(BaseModel):
    """A single frame in the simulation timeline."""
    timestamp_min: float
    stations: List[TimelineStationSnapshot]


# --- Legacy Response Models ---

class ValidationResult(BaseModel):
    """Legacy validation result model."""
    passed: bool
    details: Dict[str, str]


class CityKPIValidationResponse(BaseModel):
    """Response for city KPI validation."""
    kpis: CityKPI
    validation: ValidationResult


class SimulationResponse(BaseModel):
    """Response for simulation run (legacy format)."""
    kpis: KPISummary
    costs: Optional[Dict[str, Any]] = None
    hourly_snapshots: Optional[List[HourlySnapshot]] = None
    timeline_frames: Optional[List[TimelineFrame]] = None


class ComparisonResponse(BaseModel):
    """Response for baseline vs scenario comparison."""
    baseline_kpis: Optional[KPISummary]
    scenario_kpis: KPISummary
    comparison: Dict[str, Any]
    baseline_costs: Optional[Dict[str, Any]] = None
    scenario_costs: Optional[Dict[str, Any]] = None
    cost_deltas: Optional[Dict[str, Any]] = None


class ScenarioCreateResponse(BaseModel):
    """Legacy response for scenario creation."""
    filename: str
    config: ScenarioConfig


class OptimizationSuggestion(BaseModel):
    """A single optimization suggestion."""
    station_id: Optional[str] = None
    type: str = Field(...,
                      description="add_chargers, add_station, remove_station")
    description: str
    priority: str = Field(..., pattern="^(high|medium|low)$")
    action_payload: Dict[str, Any] = {}


class OptimizationResponse(BaseModel):
    """Response containing optimization suggestions."""
    suggestions: List[OptimizationSuggestion]
