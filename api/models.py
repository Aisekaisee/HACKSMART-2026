from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

# --- Base Models ---

class Station(BaseModel):
    station_id: str
    tier: str = Field(pattern="^(high|medium|low)$")
    bays: int = Field(gt=0)
    chargers: int = Field(ge=0)
    inventory_capacity: int = Field(gt=0)
    lat: float
    lon: float
    initial_charged: Optional[int] = None

class Demand(BaseModel):
    base_rates: Dict[str, float]
    time_multipliers: Dict[int, float]
    scenario_multiplier: float = 1.0

class Operations(BaseModel):
    swap_duration: float = 2.0
    charge_duration: float = 60.0
    replenishment_threshold: float = 0.2
    replenishment_amount: int = 10
    replenishment_delay: float = 30.0

class BaselineConfig(BaseModel):
    stations: List[Station]
    demand: Demand
    operations: Operations
    simulation_duration: float = 1440.0
    random_seed: Optional[int] = 42

class ScenarioConfig(BaseModel):
    name: str
    description: str = ""
    add_stations: List[Station] = []
    remove_station_ids: List[str] = []
    modify_stations: Dict[str, Dict[str, Any]] = {}
    demand_multiplier: Optional[float] = None
    operations_override: Dict[str, Any] = {}

    class Config:
        arbitrary_types_allowed = True

# --- API Response Models ---

class StationKPI(BaseModel):
    station_id: str
    tier: str
    total_arrivals: int
    successful_swaps: int
    lost_swaps: int
    lost_swaps_pct: float
    avg_wait_time: float
    bay_utilization: float
    charger_utilization: float
    avg_charged_inventory: float

class CityKPI(BaseModel):
    avg_wait_time: float
    lost_swaps_pct: float
    total_lost: int
    total_arrivals: int
    charger_utilization: float
    idle_inventory_pct: float
    throughput: float
    cost_proxy: float

class KPISummary(BaseModel):
    city_kpis: CityKPI
    stations: List[StationKPI]

class ValidationResult(BaseModel):
    passed: bool
    details: Dict[str, str]

class CityKPIValidationResponse(BaseModel):
    kpis: CityKPI
    validation: ValidationResult

class SimulationResponse(BaseModel):
    kpis: KPISummary
    costs: Optional[Dict[str, Any]] = None

class ComparisonResponse(BaseModel):
    baseline_kpis: Optional[KPISummary]
    scenario_kpis: KPISummary
    comparison: Dict[str, Any]
    baseline_costs: Optional[Dict[str, Any]] = None
    scenario_costs: Optional[Dict[str, Any]] = None
    cost_deltas: Optional[Dict[str, Any]] = None

class ScenarioCreateResponse(BaseModel):
    filename: str
    config: ScenarioConfig

class OptimizationSuggestion(BaseModel):
    station_id: Optional[str] = None
    type: str = Field(..., description="add_chargers, add_bays, add_station, remove_station")
    description: str
    priority: str = Field(..., pattern="^(high|medium|low)$")
    action_payload: Dict[str, Any] = {}

class OptimizationResponse(BaseModel):
    suggestions: List[OptimizationSuggestion]

