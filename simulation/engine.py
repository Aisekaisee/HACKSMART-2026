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
from simulation.timeline_recorder import TimelineRecorder


class SimulationEngine:
    """Discrete-event simulation engine using SimPy."""

    def __init__(self, config: BaselineConfig):
        """Initialize simulation engine with configuration."""
        self.config = config
        self.env = simpy.Environment()
        self.stations: List[Station] = []
        self.demand_generators: List[DemandGenerator] = []
        self.hourly_snapshots: List[Dict[str, Any]] = []  # Time-series data

        # Timeline recorder for video-scrubber style playback
        # Compute interval based on duration_hours
        timeline_interval = self._compute_timeline_interval()
        self.timeline_recorder = TimelineRecorder(
            interval_min=timeline_interval)

        # Set random seed for reproducibility
        if config.random_seed is not None:
            self.random_state = np.random.RandomState(config.random_seed)
        else:
            self.random_state = np.random.RandomState()

    def _compute_timeline_interval(self) -> float:
        """Compute timeline recording interval based on simulation duration.

        Returns:
            Interval in minutes: 15 for ≤24h, 60 for ≤168h (weekly), 240 otherwise.
        """
        # Get duration in hours from config (uses duration_hours if set, else simulation_duration/60)
        if hasattr(self.config, 'duration_hours') and self.config.duration_hours is not None:
            duration_hours = self.config.duration_hours
        else:
            duration_hours = self.config.simulation_duration / 60.0

        if duration_hours <= 24:
            return 15.0  # 15-minute intervals for daily sims
        elif duration_hours <= 168:  # 7 days
            return 60.0  # Hourly intervals for weekly sims
        else:
            return 240.0  # 4-hour intervals for monthly+ sims

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

        # Start hourly snapshot collection
        self.env.process(self._collect_hourly_snapshots())

        # Start timeline recording
        self.env.process(self._record_timeline())

    def _collect_hourly_snapshots(self):
        """SimPy process to collect snapshot data every hour."""
        while True:
            current_hour = int(self.env.now / 60)

            # Collect snapshot for all stations
            snapshot = {
                "hour": current_hour,
                "time_minutes": self.env.now,
                "stations": []
            }

            for station in self.stations:
                station_snapshot = {
                    "station_id": station.station_id,
                    "charged_inventory": station.charged_store.level,
                    "depleted_inventory": station.depleted_count,
                    "queue_length": len(station.charged_store.get_queue),
                    "total_arrivals": station.total_arrivals,
                    "successful_swaps": station.successful_swaps,
                    "rejected_swaps": station.rejected_swaps,
                }
                snapshot["stations"].append(station_snapshot)

            self.hourly_snapshots.append(snapshot)

            # Wait 60 minutes for next snapshot
            yield self.env.timeout(60)

    def _record_timeline(self):
        """SimPy process to tick the timeline recorder."""
        while True:
            # Tick the recorder with current time and stations
            self.timeline_recorder.tick(self.env.now, self.stations)
            # Check every minute (the recorder handles interval logic internally)
            yield self.env.timeout(1)

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
        # Get max_wait_time from config, with fallback default
        max_wait_time = getattr(self.config.operations, 'max_wait_time', 15.0)

        return Station(
            env=self.env,
            station_id=station_config.station_id,
            tier=station_config.tier,
            # bays=station_config.bays, # Removed
            chargers=station_config.chargers,
            inventory_capacity=station_config.inventory_capacity,
            initial_charged=station_config.initial_charged,
            swap_duration=self.config.operations.swap_duration,
            charge_duration=self.config.operations.charge_duration,
            replenishment_threshold=self.config.operations.replenishment_threshold,
            replenishment_amount=self.config.operations.replenishment_amount,
            replenishment_delay=self.config.operations.replenishment_delay,
            max_wait_time=max_wait_time
        )

    def _create_demand_generator(
        self,
        station: Station,
        station_config: StationConfig
    ) -> DemandGenerator:
        """Create a DemandGenerator for a station."""
        # Get base rate for this station's tier
        base_rate = self.config.demand.base_rates.get(
            station_config.tier, 10.0)

        return DemandGenerator(
            env=self.env,
            station=station,
            base_rate=base_rate,
            time_multipliers=self.config.demand.time_multipliers,
            scenario_multiplier=self.config.demand.scenario_multiplier,
            random_state=self.random_state,
            station_lat=station_config.lat,
            station_lon=station_config.lon,
            weather_modifiers=self.config.demand.weather_modifiers,
            event_modifiers=self.config.demand.event_modifiers
        )

    def _collect_results(self) -> Dict[str, Any]:
        """Collect simulation results from all stations."""
        results = {
            "simulation_duration": self.config.simulation_duration,
            "random_seed": self.config.random_seed,
            "hourly_snapshots": self.hourly_snapshots,  # Time-series data for playback
            "timeline_frames": self.timeline_recorder.to_serializable(),
            # Alias for frontend compatibility
            "timeline": self.timeline_recorder.to_serializable(),
            "stations": []
        }

        # Collect station-level data
        for station in self.stations:
            station_data = {
                "station_id": station.station_id,
                "tier": station.tier,
                "chargers": station.inventory_capacity,  # chargers = inventory_capacity
                "stats": station.get_stats_summary(),
                "swap_events": station.swap_events,
                "charge_events": station.charge_events,
                "inventory_events": station.inventory_events
            }
            results["stations"].append(station_data)

        return results
