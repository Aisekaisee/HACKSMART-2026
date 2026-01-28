"""Scenario applicator for applying deltas to baseline configuration."""

import copy
from typing import Dict, Any

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
