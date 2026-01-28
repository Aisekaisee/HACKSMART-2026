"""Main simulation engine orchestrating multiple stations."""

import simpy
import numpy as np
from typing import List, Dict, Any
import sys
from pathlib import Path

# Ensure imports work
if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent.parent))

from config.schema import BaselineConfig, StationConfig
from simulation.station import Station
from simulation.demand import DemandGenerator


class SimulationEngine:
    """Discrete-event simulation engine using SimPy."""
    
    def __init__(self, config: BaselineConfig):
        """Initialize simulation engine with configuration."""
        self.config = config
        self.env = simpy.Environment()
        self.stations: List[Station] = []
        self.demand_generators: List[DemandGenerator] = []
        
        # Set random seed for reproducibility
        if config.random_seed is not None:
            self.random_state = np.random.RandomState(config.random_seed)
        else:
            self.random_state = np.random.RandomState()
    
    def setup(self):
        """Set up simulation environment (create stations and demand generators)."""
        # Create stations
        for station_config in self.config.stations:
            station = self._create_station(station_config)
            self.stations.append(station)
            
            # Create demand generator for this station
            demand_gen = self._create_demand_generator(station, station_config)
            self.demand_generators.append(demand_gen)
            
            # Start demand generation process
            self.env.process(demand_gen.generate_arrivals())
    
    def run(self) -> Dict[str, Any]:
        """Run simulation and return results."""
        # Setup environment
        self.setup()
        
        # Run simulation
        self.env.run(until=self.config.simulation_duration)
        
        # Collect results
        results = self._collect_results()
        
        return results
    
    def _create_station(self, station_config: StationConfig) -> Station:
        """Create a Station instance from configuration."""
        return Station(
            env=self.env,
            station_id=station_config.station_id,
            tier=station_config.tier,
            bays=station_config.bays,
            chargers=station_config.chargers,
            inventory_capacity=station_config.inventory_capacity,
            initial_charged=station_config.initial_charged,
            swap_duration=self.config.operations.swap_duration,
            charge_duration=self.config.operations.charge_duration,
            replenishment_threshold=self.config.operations.replenishment_threshold,
            replenishment_amount=self.config.operations.replenishment_amount,
            replenishment_delay=self.config.operations.replenishment_delay
        )
    
    def _create_demand_generator(
        self,
        station: Station,
        station_config: StationConfig
    ) -> DemandGenerator:
        """Create a DemandGenerator for a station."""
        # Get base rate for this station's tier
        base_rate = self.config.demand.base_rates.get(station_config.tier, 10.0)
        
        return DemandGenerator(
            env=self.env,
            station=station,
            base_rate=base_rate,
            time_multipliers=self.config.demand.time_multipliers,
            scenario_multiplier=self.config.demand.scenario_multiplier,
            random_state=self.random_state
        )
    
    def _collect_results(self) -> Dict[str, Any]:
        """Collect simulation results from all stations."""
        results = {
            "simulation_duration": self.config.simulation_duration,
            "random_seed": self.config.random_seed,
            "stations": []
        }
        
        # Collect station-level data
        for station in self.stations:
            station_data = {
                "station_id": station.station_id,
                "tier": station.tier,
                "stats": station.get_stats_summary(),
                "swap_events": station.swap_events,
                "charge_events": station.charge_events,
                "inventory_events": station.inventory_events
            }
            results["stations"].append(station_data)
        
        return results
