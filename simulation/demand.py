"""Demand generation with Poisson arrivals and time-of-day multipliers."""

import simpy
import numpy as np
from typing import Dict


class DemandGenerator:
    """Generate customer arrivals using Poisson process."""
    
    def __init__(
        self,
        env: simpy.Environment,
        station,  # Station instance
        base_rate: float,  # Base arrivals per hour
        time_multipliers: Dict[int, float],
        scenario_multiplier: float = 1.0,
        random_state: np.random.RandomState = None
    ):
        """Initialize demand generator."""
        self.env = env
        self.station = station
        self.base_rate = base_rate
        self.time_multipliers = time_multipliers
        self.scenario_multiplier = scenario_multiplier
        self.random_state = random_state or np.random.RandomState()
        self.customer_counter = 0
    
    def generate_arrivals(self):
        """SimPy process to generate customer arrivals."""
        while True:
            # Calculate current arrival rate
            current_rate = self._calculate_rate()
            
            # Convert rate from per-hour to per-minute
            rate_per_minute = current_rate / 60.0
            
            # Calculate inter-arrival time using exponential distribution
            # For Poisson process, inter-arrival times are exponentially distributed
            if rate_per_minute > 0:
                inter_arrival_time = self.random_state.exponential(1.0 / rate_per_minute)
            else:
                inter_arrival_time = 60.0  # Wait an hour if rate is zero
            
            # Wait for next arrival
            yield self.env.timeout(inter_arrival_time)
            
            # Generate customer
            self.customer_counter += 1
            customer_id = f"{self.station.station_id}_C{self.customer_counter}"
            
            # Process swap (spawn as separate process)
            self.env.process(self.station.process_swap(customer_id))
    
    def _calculate_rate(self) -> float:
        """Calculate current arrival rate based on time-of-day and scenario."""
        # Get current simulation time in minutes
        current_time_minutes = self.env.now
        
        # Convert to hour of day (0-23)
        current_hour = int((current_time_minutes / 60) % 24)
        
        # Get time-of-day multiplier
        time_multiplier = self.time_multipliers.get(current_hour, 1.0)
        
        # Calculate effective rate
        effective_rate = self.base_rate * time_multiplier * self.scenario_multiplier
        
        return effective_rate
