"""Configuration schemas using dataclasses."""

from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class StationConfig:
    """Configuration for a single swap station."""
    station_id: str
    tier: str  # "high", "medium", "low"
    # bays removed
    chargers: int  # Number of parallel chargers
    inventory_capacity: int  # Maximum battery inventory
    lat: float
    lon: float
    initial_charged: Optional[int] = None  # Initial charged batteries (defaults to capacity)
    
    def __post_init__(self):
        """Validate and set defaults."""
        if self.initial_charged is None:
            self.initial_charged = self.inventory_capacity
        
        # Validation
        assert self.tier in ["high", "medium", "low"], f"Invalid tier: {self.tier}"
        # assert self.bays > 0, "Bays must be positive" # Removed
        assert self.chargers >= 0, "Chargers cannot be negative"
        assert self.inventory_capacity > 0, "Inventory capacity must be positive"
        assert 0 <= self.initial_charged <= self.inventory_capacity
        

@dataclass
class DemandConfig:
    """Configuration for demand arrival patterns."""
    # Base arrival rates per station tier (swaps per hour)
    base_rates: Dict[str, float] = field(default_factory=lambda: {
        "high": 20.0,
        "medium": 12.0,
        "low": 6.0
    })
    
    # Time-of-day multipliers (24 hourly buckets)
    # Format: {hour: multiplier}
    time_multipliers: Dict[int, float] = field(default_factory=lambda: {
        0: 0.3, 1: 0.2, 2: 0.2, 3: 0.2, 4: 0.3, 5: 0.5,
        6: 0.8, 7: 1.2, 8: 1.5, 9: 1.3, 10: 1.1, 11: 1.0,
        12: 1.0, 13: 0.9, 14: 0.9, 15: 1.0, 16: 1.2, 17: 1.5,
        18: 1.8, 19: 1.6, 20: 1.3, 21: 1.0, 22: 0.7, 23: 0.5
    })
    
    # Scenario-specific multipliers (applied globally or per-station)
    scenario_multiplier: float = 1.0
    

@dataclass
class OperationalConfig:
    """Configuration for operational parameters."""
    swap_duration: float = 2.0  # minutes
    charge_duration: float = 210.0  # minutes (3.5 hours)
    replenishment_threshold: float = 0.2  # Trigger replenishment at 20% capacity
    replenishment_amount: int = 10  # Number of batteries to replenish
    replenishment_delay: float = 30.0  # minutes to receive replenishment
    

@dataclass
class BaselineConfig:
    """Complete baseline configuration."""
    stations: List[StationConfig]
    demand: DemandConfig
    operations: OperationalConfig
    duration_hours: Optional[float] = None  # Duration in hours (if provided, overrides simulation_duration)
    simulation_duration: float = 1440.0  # minutes (24 hours default)
    random_seed: Optional[int] = 42
    
    def __post_init__(self):
        """Validate baseline config."""
        # If duration_hours is provided, convert to minutes and use as simulation_duration
        if self.duration_hours is not None:
            self.simulation_duration = self.duration_hours * 60.0
        
        assert len(self.stations) > 0, "At least one station required"
        assert self.simulation_duration > 0, "Simulation duration must be positive"


@dataclass
class ScenarioConfig:
    """Scenario delta configuration (changes to apply to baseline)."""
    name: str
    description: str = ""
    
    # Station modifications
    add_stations: List[StationConfig] = field(default_factory=list)
    remove_station_ids: List[str] = field(default_factory=list)
    modify_stations: Dict[str, Dict] = field(default_factory=dict)  # {station_id: {attribute: value}}
    
    # Demand modifications
    demand_multiplier: Optional[float] = None
    
    # Operational modifications
    operations_override: Optional[Dict] = field(default_factory=dict)
