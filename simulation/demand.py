"""Demand generation with Poisson arrivals and time-of-day multipliers."""

import simpy
import numpy as np
import math
from typing import Dict


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth.
    
    Uses the haversine formula to compute the shortest distance over
    the Earth's surface between two points specified by latitude/longitude.
    
    Args:
        lat1: Latitude of first point in degrees.
        lon1: Longitude of first point in degrees.
        lat2: Latitude of second point in degrees.
        lon2: Longitude of second point in degrees.
    
    Returns:
        Distance between the two points in kilometers.
    """
    # Earth's radius in kilometers
    R = 6371.0
    
    # Convert degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Differences
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Haversine formula
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance


class DemandGenerator:
    """Generate customer arrivals using Poisson process."""
    
    def __init__(
        self,
        env: simpy.Environment,
        station,  # Station instance
        base_rate: float,  # Base arrivals per hour
        time_multipliers: Dict[int, float],
        scenario_multiplier: float = 1.0,
        random_state: np.random.RandomState = None,
        station_lat: float = None,
        station_lon: float = None,
        weather_modifiers: list = None,
        event_modifiers: list = None
    ):
        """Initialize demand generator.
        
        Args:
            env: SimPy environment.
            station: Station instance.
            base_rate: Base arrivals per hour.
            time_multipliers: Dict mapping hour (0-23) to multiplier.
            scenario_multiplier: Global scenario multiplier.
            random_state: NumPy random state for reproducibility.
            station_lat: Station latitude for geo-scoped modifiers.
            station_lon: Station longitude for geo-scoped modifiers.
            weather_modifiers: List of weather demand modifiers from config.
            event_modifiers: List of event demand modifiers from config.
        """
        self.env = env
        self.station = station
        self.base_rate = base_rate
        self.time_multipliers = time_multipliers
        self.scenario_multiplier = scenario_multiplier
        self.random_state = random_state or np.random.RandomState()
        self.customer_counter = 0
        
        # Station coordinates for geo-scoped modifiers
        self.station_lat = station_lat
        self.station_lon = station_lon
        
        # Demand modifiers from scenario
        self.weather_modifiers = weather_modifiers or []
        self.event_modifiers = event_modifiers or []
    
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
        """Calculate current arrival rate based on time-of-day, scenario, and modifiers."""
        # Get current simulation time in minutes
        current_time_minutes = self.env.now
        
        # Convert to hour of day (0-23)
        current_hour = int((current_time_minutes / 60) % 24)
        
        # Get time-of-day multiplier
        time_multiplier = self.time_multipliers.get(current_hour, 1.0)
        
        # Calculate base effective rate
        effective_rate = self.base_rate * time_multiplier * self.scenario_multiplier
        
        # Apply demand modifiers (weather, events)
        modifier_multiplier = self._apply_demand_modifiers(current_hour)
        effective_rate *= modifier_multiplier
        
        return effective_rate
    
    def _apply_demand_modifiers(self, current_hour: int) -> float:
        """Apply active demand modifiers for the current hour.
        
        Checks all weather and event modifiers, applies those that are active
        for the current hour and (for geo-scoped) within range of the station.
        
        Args:
            current_hour: Current simulation hour (0-23).
        
        Returns:
            Combined multiplier from all applicable modifiers (they stack multiplicatively).
        """
        total_multiplier = 1.0
        
        # Apply weather modifiers (global scope)
        for modifier in self.weather_modifiers:
            start_hour = modifier.get("start_hour", 0)
            end_hour = modifier.get("end_hour", 24)
            multiplier = modifier.get("multiplier", 1.0)
            
            # Check if current hour is within the modifier's time window
            if self._is_hour_in_window(current_hour, start_hour, end_hour):
                total_multiplier *= multiplier
        
        # Apply event modifiers (geo-scoped)
        for modifier in self.event_modifiers:
            start_hour = modifier.get("start_hour", 0)
            end_hour = modifier.get("end_hour", 24)
            multiplier = modifier.get("multiplier", 1.0)
            
            # Check if current hour is within the modifier's time window
            if not self._is_hour_in_window(current_hour, start_hour, end_hour):
                continue
            
            # For geo-scoped modifiers, check distance
            scope = modifier.get("scope", "geo")
            if scope == "geo" and self.station_lat is not None and self.station_lon is not None:
                event_lat = modifier.get("latitude")
                event_lon = modifier.get("longitude")
                radius_km = modifier.get("radius_km", 5.0)
                
                if event_lat is not None and event_lon is not None:
                    distance = haversine(
                        self.station_lat, self.station_lon,
                        event_lat, event_lon
                    )
                    
                    # Only apply if station is within the event's radius
                    if distance <= radius_km:
                        total_multiplier *= multiplier
            elif scope == "global":
                # If scope is global (shouldn't normally be in event_modifiers, but handle it)
                total_multiplier *= multiplier
        
        return total_multiplier
    
    def _is_hour_in_window(self, current_hour: int, start_hour: int, end_hour: int) -> bool:
        """Check if the current hour falls within a time window.
        
        Handles both normal windows (e.g., 9-17) and overnight windows (e.g., 22-6).
        
        Args:
            current_hour: Current hour (0-23).
            start_hour: Window start hour (0-23).
            end_hour: Window end hour (0-24, where 24 means midnight).
        
        Returns:
            True if current_hour is within the window.
        """
        if start_hour <= end_hour:
            # Normal window (e.g., 9 to 17)
            return start_hour <= current_hour < end_hour
        else:
            # Overnight window (e.g., 22 to 6)
            return current_hour >= start_hour or current_hour < end_hour

