"""Configuration loader with YAML/JSON support and deep copy utilities."""

import yaml
import json
import copy
from pathlib import Path
from typing import Union, Dict, Any

from .schema import (
    StationConfig,
    DemandConfig,
    OperationalConfig,
    BaselineConfig,
    ScenarioConfig
)


class ConfigLoader:
    """Load and parse configuration files."""
    
    @staticmethod
    def load_baseline(config_path: Union[str, Path]) -> BaselineConfig:
        """Load baseline configuration from YAML or JSON file."""
        config_path = Path(config_path)
        
        with open(config_path, 'r') as f:
            if config_path.suffix in ['.yaml', '.yml']:
                data = yaml.safe_load(f)
            elif config_path.suffix == '.json':
                data = json.load(f)
            else:
                raise ValueError(f"Unsupported config format: {config_path.suffix}")
        
        return ConfigLoader._parse_baseline(data)
    
    @staticmethod
    def load_scenario(config_path: Union[str, Path]) -> ScenarioConfig:
        """Load scenario configuration from YAML or JSON file."""
        config_path = Path(config_path)
        
        with open(config_path, 'r') as f:
            if config_path.suffix in ['.yaml', '.yml']:
                data = yaml.safe_load(f)
            elif config_path.suffix == '.json':
                data = json.load(f)
            else:
                raise ValueError(f"Unsupported config format: {config_path.suffix}")
        
        return ConfigLoader._parse_scenario(data)
    
    @staticmethod
    def _parse_baseline(data: Dict[str, Any]) -> BaselineConfig:
        """Parse baseline configuration dictionary."""
        # Parse stations
        stations = [
            StationConfig(**station_data)
            for station_data in data.get('stations', [])
        ]
        
        # Parse demand config
        demand_data = data.get('demand', {})
        demand = DemandConfig(**demand_data)
        
        # Parse operational config
        ops_data = data.get('operations', {})
        operations = OperationalConfig(**ops_data)
        
        # Parse simulation parameters
        sim_duration = data.get('simulation_duration', 1440.0)
        random_seed = data.get('random_seed', 42)
        
        return BaselineConfig(
            stations=stations,
            demand=demand,
            operations=operations,
            simulation_duration=sim_duration,
            random_seed=random_seed
        )
    
    @staticmethod
    def _parse_scenario(data: Dict[str, Any]) -> ScenarioConfig:
        """Parse scenario configuration dictionary."""
        name = data.get('name', 'Unnamed Scenario')
        description = data.get('description', '')
        
        # Parse station additions
        add_stations = [
            StationConfig(**station_data)
            for station_data in data.get('add_stations', [])
        ]
        
        # Parse station removals
        remove_station_ids = data.get('remove_station_ids', [])
        
        # Parse station modifications
        modify_stations = data.get('modify_stations', {})
        
        # Parse demand multiplier
        demand_multiplier = data.get('demand_multiplier')
        
        # Parse operations overrides
        operations_override = data.get('operations_override', {})
        
        return ScenarioConfig(
            name=name,
            description=description,
            add_stations=add_stations,
            remove_station_ids=remove_station_ids,
            modify_stations=modify_stations,
            demand_multiplier=demand_multiplier,
            operations_override=operations_override
        )
    
    @staticmethod
    def deep_copy_baseline(baseline: BaselineConfig) -> BaselineConfig:
        """Create a deep copy of baseline configuration."""
        return copy.deepcopy(baseline)
    
    @staticmethod
    def save_baseline(baseline: BaselineConfig, output_path: Union[str, Path]):
        """Save baseline configuration to YAML file."""
        output_path = Path(output_path)
        
        # Convert to dict
        data = {
            'stations': [vars(s) for s in baseline.stations],
            'demand': vars(baseline.demand),
            'operations': vars(baseline.operations),
            'simulation_duration': baseline.simulation_duration,
            'random_seed': baseline.random_seed
        }
        
        with open(output_path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)
