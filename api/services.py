import yaml
from pathlib import Path
from typing import List, Optional, Dict, Any

from config.loader import ConfigLoader
from simulation.engine import SimulationEngine
from kpis.calculator import KPICalculator
from kpis.cost_model import CostModel
from scenarios.applicator import ScenarioApplicator
from config.schema import BaselineConfig as SchemaBaselineConfig
from config.schema import ScenarioConfig as SchemaScenarioConfig

from api.models import (
    BaselineConfig, ScenarioConfig, KPISummary, 
    SimulationResponse, ComparisonResponse, ScenarioCreateResponse,
    CityKPIValidationResponse, ValidationResult, CityKPI, StationKPI,
    ProjectCreate, ProjectUpdate, StationCreate, StationUpdate,
    ScenarioCreate, ScenarioUpdate
)
from api.supabase_client import get_supabase
from validation.baseline_validator import BaselineValidator

CONFIG_DIR = Path("configs")


# ============================================================
# PROJECT SERVICES
# ============================================================

def create_project(owner_id: str, data: ProjectCreate) -> Dict[str, Any]:
    """Create a new project."""
    supabase = get_supabase()
    
    insert_data = {
        "owner_id": owner_id,
        "name": data.name,
    }
    if data.description:
        insert_data["description"] = data.description
    
    response = supabase.table("projects").insert(insert_data).execute()
    return response.data[0] if response.data else None


def get_projects(owner_id: str) -> List[Dict[str, Any]]:
    """Get all projects for a user, sorted by created_at descending."""
    supabase = get_supabase()
    
    response = supabase.table("projects") \
        .select("*") \
        .eq("owner_id", owner_id) \
        .order("created_at", desc=True) \
        .execute()
    
    return response.data or []


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    """Get a single project by ID."""
    supabase = get_supabase()
    
    response = supabase.table("projects") \
        .select("*") \
        .eq("id", project_id) \
        .single() \
        .execute()
    
    return response.data if response.data else None


def update_project(project_id: str, data: ProjectUpdate) -> Optional[Dict[str, Any]]:
    """Update a project, only updating non-None fields."""
    supabase = get_supabase()
    
    # Build update dict with only non-None fields
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.baseline_config is not None:
        update_data["baseline_config"] = data.baseline_config
    
    if not update_data:
        return get_project(project_id)
    
    # Always update updated_at
    update_data["updated_at"] = "now()"
    
    response = supabase.table("projects") \
        .update(update_data) \
        .eq("id", project_id) \
        .execute()
    
    return response.data[0] if response.data else None


# ============================================================
# STATION SERVICES
# ============================================================

def create_station(project_id: str, data: StationCreate) -> Dict[str, Any]:
    """Create a new station for a project."""
    supabase = get_supabase()
    
    insert_data = {
        "project_id": project_id,
        "station_id": data.station_id,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "chargers": data.chargers,
        "bays": data.bays,
        "inventory_cap": data.inventory_cap,
    }
    if data.name:
        insert_data["name"] = data.name
    
    response = supabase.table("stations").insert(insert_data).execute()
    return response.data[0] if response.data else None


def get_stations(project_id: str) -> List[Dict[str, Any]]:
    """Get all stations for a project."""
    supabase = get_supabase()
    
    response = supabase.table("stations") \
        .select("*") \
        .eq("project_id", project_id) \
        .eq("active", True) \
        .execute()
    
    return response.data or []


def update_station(station_id: str, data: StationUpdate) -> Optional[Dict[str, Any]]:
    """Update a station, only updating non-None fields."""
    supabase = get_supabase()
    
    # Build update dict with only non-None fields
    update_data = {}
    if data.station_id is not None:
        update_data["station_id"] = data.station_id
    if data.name is not None:
        update_data["name"] = data.name
    if data.latitude is not None:
        update_data["latitude"] = data.latitude
    if data.longitude is not None:
        update_data["longitude"] = data.longitude
    if data.chargers is not None:
        update_data["chargers"] = data.chargers
    if data.bays is not None:
        update_data["bays"] = data.bays
    if data.inventory_cap is not None:
        update_data["inventory_cap"] = data.inventory_cap
    if data.active is not None:
        update_data["active"] = data.active
    
    if not update_data:
        # Return current station if nothing to update
        response = supabase.table("stations").select("*").eq("id", station_id).single().execute()
        return response.data
    
    update_data["updated_at"] = "now()"
    
    response = supabase.table("stations") \
        .update(update_data) \
        .eq("id", station_id) \
        .execute()
    
    return response.data[0] if response.data else None


def delete_station(station_id: str) -> bool:
    """Delete a station. Returns True if something was deleted."""
    supabase = get_supabase()
    
    response = supabase.table("stations") \
        .delete() \
        .eq("id", station_id) \
        .execute()
    
    return len(response.data) > 0 if response.data else False


# ============================================================
# SCENARIO SERVICES
# ============================================================

def create_scenario(project_id: str, data: ScenarioCreate) -> Dict[str, Any]:
    """Create a new scenario for a project."""
    supabase = get_supabase()
    
    # Convert intervention list to plain dicts
    interventions = [
        {"type": item.type, "params": item.params}
        for item in data.interventions
    ]
    
    insert_data = {
        "project_id": project_id,
        "name": data.name,
        "interventions": interventions,
        "duration_hours": data.duration_hours,
        "status": "draft"
    }
    if data.description:
        insert_data["description"] = data.description
    
    response = supabase.table("scenarios").insert(insert_data).execute()
    return response.data[0] if response.data else None


def get_scenarios(project_id: str) -> List[Dict[str, Any]]:
    """Get all scenarios for a project, sorted by created_at descending."""
    supabase = get_supabase()
    
    response = supabase.table("scenarios") \
        .select("*") \
        .eq("project_id", project_id) \
        .order("created_at", desc=True) \
        .execute()
    
    return response.data or []


def get_scenario(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Get a single scenario by ID."""
    supabase = get_supabase()
    
    response = supabase.table("scenarios") \
        .select("*") \
        .eq("id", scenario_id) \
        .single() \
        .execute()
    
    return response.data if response.data else None


def update_scenario_result(
    scenario_id: str, 
    kpis: Dict[str, Any], 
    timeline: List[Dict[str, Any]], 
    status: str
) -> Optional[Dict[str, Any]]:
    """Update scenario result fields after simulation runs."""
    supabase = get_supabase()
    
    update_data = {
        "result_kpis": kpis,
        "result_timeline": timeline,
        "status": status,
        "updated_at": "now()"
    }
    
    response = supabase.table("scenarios") \
        .update(update_data) \
        .eq("id", scenario_id) \
        .execute()
    
    return response.data[0] if response.data else None


# ============================================================
# SIMULATION RUNNER
# ============================================================

def run_simulation(
    scenario: Dict[str, Any],
    project: Dict[str, Any],
    stations: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Bridge between API and Python simulation engine.
    
    Args:
        scenario: Scenario dict from database (with interventions, duration_hours)
        project: Project dict from database (with baseline_config)
        stations: List of station dicts from database
    
    Returns:
        Result dict with 'kpis' and 'timeline' keys
    """
    from config.schema import (
        BaselineConfig, StationConfig, DemandConfig, 
        OperationalConfig, ScenarioConfig
    )
    
    # 1. Start with the project's baseline_config
    baseline_config = project.get("baseline_config") or {}
    
    # 2. Set duration_hours from scenario
    duration_hours = scenario.get("duration_hours", 24)
    simulation_duration = duration_hours * 60  # Convert to minutes
    
    # 3. Inject current station list into config
    # Convert database stations to StationConfig format
    station_configs = []
    for s in stations:
        if not s.get("active", True):
            continue
        
        # Determine tier based on chargers or default to medium
        chargers = s.get("chargers", 5)
        if chargers >= 10:
            tier = "high"
        elif chargers >= 5:
            tier = "medium"
        else:
            tier = "low"
        
        station_configs.append(StationConfig(
            station_id=s.get("station_id"),
            tier=tier,
            chargers=chargers,
            inventory_capacity=s.get("inventory_cap", 100),
            lat=s.get("latitude", 0.0),
            lon=s.get("longitude", 0.0),
            initial_charged=None
        ))
    
    # 4. Build the base configuration
    # Use baseline_config from project or create defaults
    demand_config = baseline_config.get("demand", {})
    demand = DemandConfig(
        base_rates=demand_config.get("base_rates", {"high": 30, "medium": 20, "low": 10}),
        time_multipliers=demand_config.get("time_multipliers", {i: 1.0 for i in range(24)}),
        scenario_multiplier=demand_config.get("scenario_multiplier", 1.0)
    )
    
    ops_config = baseline_config.get("operations", {})
    operations = OperationalConfig(
        swap_duration=ops_config.get("swap_duration", 2.0),
        charge_duration=ops_config.get("charge_duration", 210.0),
        replenishment_threshold=ops_config.get("replenishment_threshold", 0.2),
        replenishment_amount=ops_config.get("replenishment_amount", 10),
        replenishment_delay=ops_config.get("replenishment_delay", 30.0)
    )
    
    config = BaselineConfig(
        stations=station_configs,
        demand=demand,
        operations=operations,
        simulation_duration=simulation_duration,
        random_seed=baseline_config.get("random_seed", 42)
    )
    
    # 5. Apply interventions through ScenarioApplicator
    interventions = scenario.get("interventions", [])
    if interventions:
        # Build a scenario config from interventions
        scenario_config = ScenarioConfig(
            name=scenario.get("name", "API Scenario"),
            description=scenario.get("description", ""),
            add_stations=[],
            remove_station_ids=[],
            modify_stations={},
            demand_multiplier=None,
            operations_override={},
            # New intervention fields
            weather_demand=[],
            event_demand=[],
            replenishment_policies=[]
        )
        
        # Parse interventions and populate scenario_config
        for intervention in interventions:
            int_type = intervention.get("type", "")
            params = intervention.get("params", {})
            
            if int_type == "weather_demand":
                scenario_config.weather_demand.append(params)
            elif int_type == "event_demand":
                scenario_config.event_demand.append(params)
            elif int_type == "replenishment_policy":
                scenario_config.replenishment_policies.append(params)
            elif int_type == "demand_multiplier":
                scenario_config.demand_multiplier = params.get("multiplier", 1.0)
            elif int_type == "modify_station":
                station_id = params.get("station_id")
                if station_id:
                    mods = {k: v for k, v in params.items() if k != "station_id"}
                    scenario_config.modify_stations[station_id] = mods
            elif int_type == "add_station":
                # Would need to create StationConfig from params
                pass
            elif int_type == "remove_station":
                station_id = params.get("station_id")
                if station_id:
                    scenario_config.remove_station_ids.append(station_id)
        
        # Apply scenario to config
        config = ScenarioApplicator.apply_scenario(config, scenario_config)
    
    # 6. Create SimulationEngine and run
    engine = SimulationEngine(config)
    results = engine.run()
    
    # Calculate costs
    cost_model = CostModel()
    costs = cost_model.calculate_costs(results, config)
    
    # Calculate KPIs with cost breakdown
    kpis = KPICalculator.calculate(
        results,
        swap_duration=config.operations.swap_duration,
        charge_duration=config.operations.charge_duration,
        cost_breakdown=costs
    )
    
    # Return combined result
    return {
        "kpis": kpis,
        "timeline": results.get("timeline_frames", []),
        "hourly_snapshots": results.get("hourly_snapshots", []),
        "costs": costs.to_dict()
    }


# ============================================================
# LEGACY SIMULATION SERVICE (preserved for backward compatibility)
# ============================================================

class SimulationService:
    @staticmethod
    def list_baselines() -> List[str]:
        return [f.name for f in CONFIG_DIR.glob("baseline_*.yaml")]

    @staticmethod
    def list_scenarios() -> List[str]:
        return [f.name for f in CONFIG_DIR.glob("scenario_*.yaml")]

    @staticmethod
    def get_baseline(filename: str) -> Optional[BaselineConfig]:
        path = CONFIG_DIR / filename
        if not path.exists():
            return None
        with open(path, 'r') as f:
            data = yaml.safe_load(f)
        return BaselineConfig(**data)

    @staticmethod
    def get_scenario(filename: str) -> Optional[ScenarioConfig]:
        path = CONFIG_DIR / filename
        if not path.exists():
            return None
        with open(path, 'r') as f:
            data = yaml.safe_load(f)
        return ScenarioConfig(**data)
    
    @staticmethod
    def create_scenario(scenario: ScenarioConfig) -> ScenarioCreateResponse:
        safe_name = scenario.name.lower().replace(" ", "_")
        filename = f"scenario_{safe_name}.yaml"
        path = CONFIG_DIR / filename
        
        data = scenario.model_dump(exclude_defaults=True)
        
        with open(path, 'w') as f:
            yaml.dump(data, f, sort_keys=False)
            
        return ScenarioCreateResponse(filename=filename, config=scenario)

    @staticmethod
    def run_baseline_city_validated(config: BaselineConfig) -> CityKPIValidationResponse:
        schema_config = SimulationService._pydantic_to_schema_baseline(config)
        
        engine = SimulationEngine(schema_config)
        results = engine.run()
        kpis = KPICalculator.calculate(
            results,
            swap_duration=schema_config.operations.swap_duration,
            charge_duration=schema_config.operations.charge_duration
        )
        
        reference_path = Path("validation/reference_kpis.yaml")
        validation = {"passed": True, "details": {"status": "Reference file not found"}}
        
        if reference_path.exists():
            ref_kpis = BaselineValidator.load_reference_kpis(reference_path)
            passed, report = BaselineValidator.validate(kpis, ref_kpis)
            
            details = {}
            for line in report:
                if ":" in line:
                    key, val = line.split(":", 1)
                    details[key.strip()] = val.strip()
                else:
                    details["summary"] = line
            
            validation = {
                "passed": passed,
                "details": details
            }
        
        return CityKPIValidationResponse(
            kpis=CityKPI(**kpis["city_kpis"]),
            validation=ValidationResult(**validation)
        )

    @staticmethod
    def run_baseline_stations(config: BaselineConfig) -> List[StationKPI]:
        schema_config = SimulationService._pydantic_to_schema_baseline(config)
        
        engine = SimulationEngine(schema_config)
        results = engine.run()
        kpis = KPICalculator.calculate(
            results,
            swap_duration=schema_config.operations.swap_duration,
            charge_duration=schema_config.operations.charge_duration
        )
        
        return [StationKPI(**s) for s in kpis["stations"]]

    @staticmethod
    def run_baseline(config: BaselineConfig) -> SimulationResponse:
        schema_config = SimulationService._pydantic_to_schema_baseline(config)
        
        engine = SimulationEngine(schema_config)
        results = engine.run()
        
        cost_model = CostModel()
        costs = cost_model.calculate_costs(results, schema_config)
        
        kpis = KPICalculator.calculate(
            results,
            swap_duration=schema_config.operations.swap_duration,
            charge_duration=schema_config.operations.charge_duration,
            cost_breakdown=costs
        )
        
        return SimulationResponse(
            kpis=KPISummary(**kpis), 
            costs=costs.to_dict(),
            hourly_snapshots=results.get("hourly_snapshots", []),
            timeline_frames=results.get("timeline_frames", [])
        )

    @staticmethod
    def run_comparison(baseline: BaselineConfig, scenario: ScenarioConfig) -> ComparisonResponse:
        base_schema = SimulationService._pydantic_to_schema_baseline(baseline)
        base_engine = SimulationEngine(base_schema)
        base_results = base_engine.run()
        base_costs = CostModel().calculate_costs(base_results, base_schema)
        base_kpis = KPICalculator.calculate(
            base_results,
            swap_duration=base_schema.operations.swap_duration,
            charge_duration=base_schema.operations.charge_duration,
            cost_breakdown=base_costs
        )
        
        scen_schema = SimulationService._pydantic_to_schema_scenario(scenario)
        modified_schema = ScenarioApplicator.apply_scenario(base_schema, scen_schema)
        
        scen_engine = SimulationEngine(modified_schema)
        scen_results = scen_engine.run()
        scen_costs = CostModel().calculate_costs(scen_results, modified_schema)
        scen_kpis = KPICalculator.calculate(
            scen_results,
            swap_duration=modified_schema.operations.swap_duration,
            charge_duration=modified_schema.operations.charge_duration,
            cost_breakdown=scen_costs
        )
        
        cost_model = CostModel()
        cost_deltas = cost_model.calculate_cost_delta(base_costs, scen_costs)
        
        return ComparisonResponse(
            baseline_kpis=KPISummary(**base_kpis),
            scenario_kpis=KPISummary(**scen_kpis),
            comparison={},
            baseline_costs=base_costs.to_dict(),
            scenario_costs=scen_costs.to_dict(),
            cost_deltas=cost_deltas
        )

    @staticmethod
    def _pydantic_to_schema_baseline(p_config: BaselineConfig) -> SchemaBaselineConfig:
        from config.schema import StationConfig, DemandConfig, OperationalConfig, BaselineConfig
        
        stations = [StationConfig(**s.model_dump()) for s in p_config.stations]
        
        demand_data = p_config.demand.model_dump()
        demand = DemandConfig(
            base_rates=demand_data['base_rates'],
            time_multipliers=demand_data['time_multipliers'],
            scenario_multiplier=demand_data['scenario_multiplier']
        )
        
        ops = OperationalConfig(**p_config.operations.model_dump())
        
        return BaselineConfig(
            stations=stations,
            demand=demand,
            operations=ops,
            simulation_duration=p_config.simulation_duration,
            random_seed=p_config.random_seed
        )

    @staticmethod
    def _pydantic_to_schema_scenario(p_config: ScenarioConfig) -> SchemaScenarioConfig:
        from config.schema import StationConfig, ScenarioConfig
        
        add_stations = [StationConfig(**s.model_dump()) for s in p_config.add_stations]
        
        return ScenarioConfig(
            name=p_config.name,
            description=p_config.description,
            add_stations=add_stations,
            remove_station_ids=p_config.remove_station_ids,
            modify_stations=p_config.modify_stations,
            demand_multiplier=p_config.demand_multiplier,
            operations_override=p_config.operations_override
        )

    @staticmethod
    def generate_optimization_suggestions(baseline_kpis: KPISummary) -> List[Dict[str, Any]]:
        suggestions = []
        
        city = baseline_kpis.city_kpis
        if city.lost_swaps_pct > 5.0:
            suggestions.append({
                "type": "add_station",
                "station_id": None,
                "description": f"High network-wide lost swaps ({city.lost_swaps_pct:.1f}%). New stations needed.",
                "priority": "high",
                "action_payload": {}
            })
            
        for s in baseline_kpis.stations:
            if s.charger_utilization > 0.7:
                suggestions.append({
                    "type": "add_chargers",
                    "station_id": s.station_id,
                    "description": f"Station {s.station_id} is congested (Util: {s.charger_utilization*100:.1f}%). Add 2 chargers.",
                    "priority": "high",
                    "action_payload": {"station_id": s.station_id, "add_chargers": 2}
                })
            elif s.charger_utilization > 0.5:
                suggestions.append({
                    "type": "add_chargers",
                    "station_id": s.station_id,
                    "description": f"Station {s.station_id} is busy (Util: {s.charger_utilization*100:.1f}%). Consider adding 1 charger.",
                    "priority": "medium",
                    "action_payload": {"station_id": s.station_id, "add_chargers": 1}
                })
            
            if s.avg_wait_time > 5.0:
                suggestions.append({
                    "type": "add_bays",
                    "station_id": s.station_id,
                    "description": f"Long wait times at {s.station_id} ({s.avg_wait_time:.1f} min). Add 1 swap bay.",
                    "priority": "high",
                    "action_payload": {"station_id": s.station_id, "add_bays": 1}
                })

            if s.charger_utilization < 0.1 and s.total_arrivals > 0:
                suggestions.append({
                    "type": "remove_chargers",
                    "station_id": s.station_id,
                    "description": f"Station {s.station_id} is underutilized (Util: {s.charger_utilization*100:.1f}%). Remove 1 charger to save OpEx.",
                    "priority": "low",
                    "action_payload": {"station_id": s.station_id, "remove_chargers": 1}
                })
                
        priority_map = {"high": 0, "medium": 1, "low": 2}
        suggestions.sort(key=lambda x: priority_map.get(x["priority"], 3))
        
        return suggestions
