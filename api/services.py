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
    CityKPIValidationResponse, ValidationResult, CityKPI, StationKPI
)
from validation.baseline_validator import BaselineValidator

CONFIG_DIR = Path("configs")

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
        # Use ConfigLoader but convert to Pydantic model
        # For simplicity, we can load yaml directly to dict then to model
        # IF the structure matches perfectly.
        # Let's verify if ConfigLoader returns a dataclass that we can dump.
        
        # ConfigLoader.load_baseline returns a dataclass.
        # We can try to use pydantic's from_attributes if we configured it, 
        # but here we defined our own Pydantic models.
        # Let's load YAML directly for "Get" endpoints to ensure we return exactly what is in file
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
        # Generate a filename if not provided or valid
        # We'll use the name field to generate a filename
        safe_name = scenario.name.lower().replace(" ", "_")
        filename = f"scenario_{safe_name}.yaml"
        path = CONFIG_DIR / filename
        
        # Convert model to dict
        data = scenario.model_dump(exclude_defaults=True)
        
        # Save to YAML
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
        
        # Load validation reference
        # Ideally we load this once or cache it, but for now load per request
        reference_path = Path("validation/reference_kpis.yaml")
        validation = {"passed": True, "details": {"status": "Reference file not found"}}
        
        if reference_path.exists():
            ref_kpis = BaselineValidator.load_reference_kpis(reference_path)
            passed, report = BaselineValidator.validate(kpis, ref_kpis)
            
            # Format report into simpler dictionary for API
            details = {}
            for line in report:
                # Poor man's parsing of the report list of strings
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
        # Convert Pydantic model back to Schema (dataclass) or dict that ConfigLoader/SimulationEngine accepts
        # SimulationEngine expects a BaselineConfig dataclass.
        # We can construct it manually or use a helper.
        
        # We need to map Pydantic BaselineConfig -> Schema BaselineConfig
        # Since the structures are identical, we can dump pydantic to dict 
        # AND then use the ConfigLoader to load from a dict (if supported) or reconstruct dataclass
        
        # ConfigLoader doesn't have load_from_dict, so let's do it manually or write to temp file?
        # Manually constructing dataclasses is cleaner.
        
        # Let's assume we can map dict to dataclass (simple for this structure)
        # Actually ConfigLoader uses dacite or similar? No, let's check ConfigLoader source if needed.
        # Checking `config/loader.py` would have been good. 
        # But `run_baseline.py` uses `ConfigLoader.load_baseline(path)`.
        
        # Let's dump Pydantic to a dict
        config_dict = config.model_dump()
        
        # Reconstruct SchemaDataclasses
        # This is a bit tedious to do simulation-side if we don't have a conversion utility.
        # A trick: Write to a temp string/file and use ConfigLoader? 
        # Or just trust that we can instantiate the dataclasses with **dict IF nested types match.
        # Nested types in dataclasses are also dataclasses. Pydantic dump returns dicts of dicts.
        # We need to convert dicts to dataclasses recursively.
        
        # Hack for now: Save to a temp file and load it using ConfigLoader?
        # Or better: Implement a `from_dict` in this Service.
        
        schema_config = SimulationService._pydantic_to_schema_baseline(config)
        
        engine = SimulationEngine(schema_config)
        results = engine.run()
        
        kpis = KPICalculator.calculate(
            results,
            swap_duration=schema_config.operations.swap_duration,
            charge_duration=schema_config.operations.charge_duration
        )
        
        cost_model = CostModel()
        costs = cost_model.calculate_costs(results, schema_config)
        
        # Include hourly snapshots and timeline frames for playback visualization
        return SimulationResponse(
            kpis=KPISummary(**kpis), 
            costs=costs.to_dict(),
            hourly_snapshots=results.get("hourly_snapshots", []),
            timeline_frames=results.get("timeline_frames", [])
        )

    @staticmethod
    def run_comparison(baseline: BaselineConfig, scenario: ScenarioConfig) -> ComparisonResponse:
        # 1. Run Baseline
        base_schema = SimulationService._pydantic_to_schema_baseline(baseline)
        base_engine = SimulationEngine(base_schema)
        base_results = base_engine.run()
        base_kpis = KPICalculator.calculate(
            base_results,
            swap_duration=base_schema.operations.swap_duration,
            charge_duration=base_schema.operations.charge_duration
        )
        base_costs = CostModel().calculate_costs(base_results, base_schema)
        
        # 2. Apply Scenario
        # Convert Scenario Pydantic -> Schema
        scen_schema = SimulationService._pydantic_to_schema_scenario(scenario)
        
        # Apply
        modified_schema = ScenarioApplicator.apply_scenario(base_schema, scen_schema)
        
        # 3. Run Scenario
        scen_engine = SimulationEngine(modified_schema)
        scen_results = scen_engine.run()
        scen_kpis = KPICalculator.calculate(
            scen_results,
            swap_duration=modified_schema.operations.swap_duration,
            charge_duration=modified_schema.operations.charge_duration
        )
        scen_costs = CostModel().calculate_costs(scen_results, modified_schema)
        
        # 4. Compare costs
        cost_model = CostModel()
        cost_deltas = cost_model.calculate_cost_delta(base_costs, scen_costs)
        
        # 5. Compare KPIs? Function exists only for printing?
        # We will return raw KPIs and let frontend do visual comparison, 
        # OR we can calculate specific diffs here.
        # For now, return both.
        
        return ComparisonResponse(
            baseline_kpis=KPISummary(**base_kpis),
            scenario_kpis=KPISummary(**scen_kpis),
            comparison={}, # Can populate with diffs if needed
            baseline_costs=base_costs.to_dict(),
            scenario_costs=scen_costs.to_dict(),
            cost_deltas=cost_deltas
        )

    # --- Helpers to convert Pydantic models to Dataclasses ---
    
    @staticmethod
    def _pydantic_to_schema_baseline(p_config: BaselineConfig) -> SchemaBaselineConfig:
        from config.schema import StationConfig, DemandConfig, OperationalConfig, BaselineConfig
        
        stations = [StationConfig(**s.model_dump()) for s in p_config.stations]
        
        # Demand - need to handle defaults if not present, but pydantic guarantees them
        # time_multipliers is Dict[int, float]
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
        
        # 1. Analyze City Level Issues
        city = baseline_kpis.city_kpis
        if city.lost_swaps_pct > 5.0:  # Fixed: was 0.05, now correctly triggers at 5%
            suggestions.append({
                "type": "add_station",
                "station_id": None,
                "description": f"High network-wide lost swaps ({city.lost_swaps_pct:.1f}%). New stations needed.",
                "priority": "high",
                "action_payload": {}
            })
            
        # 2. Analyze Station Level Issues
        for s in baseline_kpis.stations:
            # High Utilization -> Add Chargers
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
            
            # High Wait Time -> Add Bays
            if s.avg_wait_time > 5.0:
                 suggestions.append({
                    "type": "add_bays",
                    "station_id": s.station_id,
                    "description": f"Long wait times at {s.station_id} ({s.avg_wait_time:.1f} min). Add 1 swap bay.",
                    "priority": "high",
                    "action_payload": {"station_id": s.station_id, "add_bays": 1}
                })

            # Low Utilization -> Optimization (Cost Saving)
            if s.charger_utilization < 0.1 and s.total_arrivals > 0:
                 suggestions.append({
                    "type": "remove_chargers",
                    "station_id": s.station_id,
                    "description": f"Station {s.station_id} is underutilized (Util: {s.charger_utilization*100:.1f}%). Remove 1 charger to save OpEx.",
                    "priority": "low",
                    "action_payload": {"station_id": s.station_id, "remove_chargers": 1}
                })
                
        # Sort by priority
        priority_map = {"high": 0, "medium": 1, "low": 2}
        suggestions.sort(key=lambda x: priority_map.get(x["priority"], 3))
        
        return suggestions

