"""Scenario applicator for applying deltas to baseline configuration."""

import copy
from typing import Dict, Any, List

from config.schema import BaselineConfig, ScenarioConfig, StationConfig
from config.loader import ConfigLoader


class ScenarioApplicator:
    """Apply scenario deltas to baseline configuration."""
    
    @staticmethod
    def apply_scenario(
        baseline: BaselineConfig,
        scenario: ScenarioConfig
    ) -> BaselineConfig:
        """
        Apply scenario changes to baseline configuration.
        Returns a new BaselineConfig with changes applied.
        Baseline is never modified.
        """
        # Deep copy baseline
        modified_config = ConfigLoader.deep_copy_baseline(baseline)
        
        # Apply station additions
        if scenario.add_stations:
            modified_config.stations.extend(copy.deepcopy(scenario.add_stations))
        
        # Apply station removals
        if scenario.remove_station_ids:
            modified_config.stations = [
                s for s in modified_config.stations
                if s.station_id not in scenario.remove_station_ids
            ]
        
        # Apply station modifications
        if scenario.modify_stations:
            ScenarioApplicator._modify_stations(
                modified_config.stations,
                scenario.modify_stations
            )
        
        # Apply demand multiplier
        if scenario.demand_multiplier is not None:
            modified_config.demand.scenario_multiplier = scenario.demand_multiplier
        
        # Apply operational overrides
        if scenario.operations_override:
            ScenarioApplicator._apply_operations_override(
                modified_config.operations,
                scenario.operations_override
            )
        
        # Apply weather demand interventions
        if scenario.weather_demand:
            ScenarioApplicator._apply_weather_demand(
                modified_config,
                scenario.weather_demand
            )
        
        # Apply event demand interventions (geo-scoped)
        if scenario.event_demand:
            ScenarioApplicator._apply_event_demand(
                modified_config,
                scenario.event_demand
            )
        
        # Apply replenishment policy interventions
        if scenario.replenishment_policies:
            ScenarioApplicator._apply_replenishment_policies(
                modified_config,
                scenario.replenishment_policies
            )
        
        return modified_config
    
    @staticmethod
    def _modify_stations(
        stations: list,
        modifications: Dict[str, Dict[str, Any]]
    ):
        """Modify station attributes in-place."""
        for station in stations:
            if station.station_id in modifications:
                changes = modifications[station.station_id]
                for attr, value in changes.items():
                    if hasattr(station, attr):
                        setattr(station, attr, value)
                    else:
                        raise ValueError(
                            f"Station {station.station_id} has no attribute '{attr}'"
                        )
    
    @staticmethod
    def _apply_operations_override(operations, overrides: Dict[str, Any]):
        """Apply operational parameter overrides."""
        for param, value in overrides.items():
            if hasattr(operations, param):
                setattr(operations, param, value)
            else:
                raise ValueError(f"Operations has no parameter '{param}'")
    
    @staticmethod
    def _apply_weather_demand(
        config: BaselineConfig,
        weather_interventions: List[Dict]
    ):
        """
        Apply weather demand interventions.
        
        Weather demand multiplies demand globally for a time window.
        Each intervention: {"multiplier": float, "start_hour": int, "end_hour": int}
        """
        for intervention in weather_interventions:
            modifier = {
                "scope": "global",
                "multiplier": intervention.get("multiplier", 1.0),
                "start_hour": intervention.get("start_hour", 0),
                "end_hour": intervention.get("end_hour", 24),
            }
            config.demand.weather_modifiers.append(modifier)
    
    @staticmethod
    def _apply_event_demand(
        config: BaselineConfig,
        event_interventions: List[Dict]
    ):
        """
        Apply event demand interventions (geo-scoped).
        
        Event demand affects only stations within radius_km of the event location.
        Each intervention: {
            "latitude": float, "longitude": float, "radius_km": float,
            "multiplier": float, "start_hour": int, "end_hour": int
        }
        """
        for intervention in event_interventions:
            modifier = {
                "scope": "geo",
                "latitude": intervention.get("latitude"),
                "longitude": intervention.get("longitude"),
                "radius_km": intervention.get("radius_km", 5.0),
                "multiplier": intervention.get("multiplier", 1.0),
                "start_hour": intervention.get("start_hour", 0),
                "end_hour": intervention.get("end_hour", 24),
            }
            config.demand.event_modifiers.append(modifier)
    
    @staticmethod
    def _apply_replenishment_policies(
        config: BaselineConfig,
        policy_interventions: List[Dict]
    ):
        """
        Apply replenishment policy interventions.
        
        Changes how stations restock batteries.
        Each intervention: {
            "policy": str ("base_stock", "s_s", "jit"),
            "params": dict (policy-specific parameters),
            "station_id": str|None (if None, apply to all stations)
        }
        
        Sets replenishment_policy and replenishment_params on station config(s).
        """
        for intervention in policy_interventions:
            policy = intervention.get("policy", "base_stock")
            params = intervention.get("params", {})
            station_id = intervention.get("station_id")
            
            if station_id:
                # Apply to specific station
                for station in config.stations:
                    if station.station_id == station_id:
                        # Store policy info on the station object
                        # (Station class should handle these if they exist)
                        station.replenishment_policy = policy
                        station.replenishment_params = params
                        break
            else:
                # Apply to all stations
                for station in config.stations:
                    station.replenishment_policy = policy
                    station.replenishment_params = params

