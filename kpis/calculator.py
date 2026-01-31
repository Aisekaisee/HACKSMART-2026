"""KPI calculator for computing city and station-level metrics."""

import numpy as np
from typing import Dict, List, Any
from dataclasses import dataclass


@dataclass
class StationKPIs:
    """Station-level KPIs."""
    station_id: str
    tier: str
    avg_wait_time: float  # minutes
    lost_swaps: int
    lost_swaps_pct: float
    total_arrivals: int
    successful_swaps: int
    charger_utilization: float  # 0-1
    avg_charged_inventory: float


@dataclass
class CityKPIs:
    """City-level aggregated KPIs."""
    avg_wait_time: float  # minutes
    lost_swaps_pct: float
    charger_utilization: float  # 0-1
    idle_inventory_pct: float
    throughput: float  # swaps per hour
    cost_proxy: float
    total_arrivals: int
    total_swaps: int
    total_lost: int


class KPICalculator:
    """Calculate KPIs from simulation results."""
    
    @staticmethod
    def calculate(
        simulation_results: Dict[str, Any],
        swap_duration: float = 2.0,
        charge_duration: float = 60.0
    ) -> Dict[str, Any]:
        """
        Calculate all KPIs from simulation results.
        Returns dict with 'city_kpis' and 'stations' lists.
        
        Args:
            simulation_results: Results from simulation engine
            swap_duration: Actual swap duration from config (minutes)
            charge_duration: Actual charge duration from config (minutes)
        """
        duration_hours = simulation_results["simulation_duration"] / 60.0
        
        station_kpis_list = []
        
        # Calculate station-level KPIs
        for station_data in simulation_results["stations"]:
            station_kpis = KPICalculator._calculate_station_kpis(
                station_data,
                simulation_results["simulation_duration"],
                swap_duration,
                charge_duration
            )
            station_kpis_list.append(station_kpis)
        
        # Calculate city-level KPIs
        city_kpis = KPICalculator._calculate_city_kpis(
            station_kpis_list,
            duration_hours
        )
        
        # Format output
        return {
            "city_kpis": {
                "avg_wait_time": round(city_kpis.avg_wait_time, 2),
                "lost_swaps_pct": round(city_kpis.lost_swaps_pct, 2),
                "charger_utilization": round(city_kpis.charger_utilization, 3),
                "idle_inventory_pct": round(city_kpis.idle_inventory_pct, 2),
                "throughput": round(city_kpis.throughput, 1),
                "cost_proxy": round(city_kpis.cost_proxy, 2),
                "total_arrivals": city_kpis.total_arrivals,
                "total_swaps": city_kpis.total_swaps,
                "total_lost": city_kpis.total_lost
            },
            "stations": [
                {
                    "station_id": kpi.station_id,
                    "tier": kpi.tier,
                    "avg_wait_time": round(kpi.avg_wait_time, 2),
                    "lost_swaps": kpi.lost_swaps,
                    "lost_swaps_pct": round(kpi.lost_swaps_pct, 2),
                    "total_arrivals": kpi.total_arrivals,
                    "successful_swaps": kpi.successful_swaps,
                    "charger_utilization": round(kpi.charger_utilization, 3),
                    "avg_charged_inventory": round(kpi.avg_charged_inventory, 1)
                }
                for kpi in station_kpis_list
            ]
        }
    
    @staticmethod
    def _calculate_station_kpis(
        station_data: Dict[str, Any],
        simulation_duration: float,
        swap_duration: float = 2.0,
        charge_duration: float = 60.0
    ) -> StationKPIs:
        """Calculate KPIs for a single station."""
        stats = station_data["stats"]
        swap_events = station_data["swap_events"]
        charge_events = station_data["charge_events"]
        inventory_events = station_data["inventory_events"]
        
        # Basic metrics
        total_arrivals = stats["total_arrivals"]
        successful_swaps = stats["successful_swaps"]
        lost_swaps = stats["rejected_swaps"]
        lost_swaps_pct = (lost_swaps / total_arrivals * 100) if total_arrivals > 0 else 0.0
        
        # Average wait time (already calculated in station)
        avg_wait_time = stats["avg_wait_time"]
        
        # Charger utilization (using actual charge duration from config)
        charger_utilization = KPICalculator._calculate_charger_utilization(
            charge_events,
            simulation_duration,
            charge_duration
        )
        
        # Average charged inventory
        avg_charged_inventory = KPICalculator._calculate_avg_inventory(
            inventory_events,
            simulation_duration
        )
        
        return StationKPIs(
            station_id=station_data["station_id"],
            tier=station_data["tier"],
            avg_wait_time=avg_wait_time,
            lost_swaps=lost_swaps,
            lost_swaps_pct=lost_swaps_pct,
            total_arrivals=total_arrivals,
            successful_swaps=successful_swaps,
            charger_utilization=charger_utilization,
            avg_charged_inventory=avg_charged_inventory
        )
    
    @staticmethod
    def _calculate_city_kpis(
        station_kpis: List[StationKPIs],
        duration_hours: float
    ) -> CityKPIs:
        """Aggregate station KPIs to city level."""
        if not station_kpis:
            return CityKPIs(
                avg_wait_time=0.0,
                lost_swaps_pct=0.0,
                charger_utilization=0.0,
                idle_inventory_pct=0.0,
                throughput=0.0,
                cost_proxy=0.0,
                total_arrivals=0,
                total_swaps=0,
                total_lost=0
            )
        
        # Aggregate totals
        total_arrivals = sum(kpi.total_arrivals for kpi in station_kpis)
        total_swaps = sum(kpi.successful_swaps for kpi in station_kpis)
        total_lost = sum(kpi.lost_swaps for kpi in station_kpis)
        
        # Weighted average wait time (by successful swaps)
        total_wait_time = sum(
            kpi.avg_wait_time * kpi.successful_swaps
            for kpi in station_kpis
        )
        avg_wait_time = total_wait_time / total_swaps if total_swaps > 0 else 0.0
        
        # Overall lost swaps percentage
        lost_swaps_pct = (total_lost / total_arrivals * 100) if total_arrivals > 0 else 0.0
        
        # Average charger utilization
        charger_utilization = np.mean([kpi.charger_utilization for kpi in station_kpis])
        
        # Idle inventory (rough proxy: normalized average charged inventory)
        # Higher charged inventory relative to capacity suggests excess capacity
        avg_inventory_values = [kpi.avg_charged_inventory for kpi in station_kpis]
        idle_inventory_pct = np.mean(avg_inventory_values) if avg_inventory_values else 0.0
        
        # Throughput (successful swaps per hour)
        throughput = total_swaps / duration_hours if duration_hours > 0 else 0.0
        
        # Cost proxy (weighted combination of wait time, lost swaps, and utilization)
        # Higher wait time and lost swaps increase cost
        # Lower utilization increases cost (idle resources)
        cost_proxy = (
            avg_wait_time * 0.5 +
            lost_swaps_pct * 2.0 +
            (1 - charger_utilization) * 10.0
        )
        
        return CityKPIs(
            avg_wait_time=avg_wait_time,
            lost_swaps_pct=lost_swaps_pct,
            charger_utilization=charger_utilization,
            idle_inventory_pct=idle_inventory_pct,
            throughput=throughput,
            cost_proxy=cost_proxy,
            total_arrivals=total_arrivals,
            total_swaps=total_swaps,
            total_lost=total_lost
        )
    
    @staticmethod
    def _calculate_charger_utilization(
        charge_events: List,
        simulation_duration: float,
        charge_duration: float = 60.0
    ) -> float:
        """Calculate charger utilization from charge events."""
        if not charge_events:
            return 0.0
        
        # Count charge end events (completed charges)
        charge_ends = [e for e in charge_events if e.event_type == "charge_end"]
        completed_charges = len(charge_ends)
        
        # Use actual charge duration from config
        total_charging_time = completed_charges * charge_duration
        
        # Utilization = total charging time / simulation duration
        utilization = min(total_charging_time / simulation_duration, 1.0) if simulation_duration > 0 else 0.0
        
        return utilization
    
    @staticmethod
    def _calculate_avg_inventory(
        inventory_events: List,
        simulation_duration: float
    ) -> float:
        """Calculate time-averaged charged inventory."""
        if not inventory_events:
            return 0.0
        
        # Time-weighted average
        total_weighted_inventory = 0.0
        
        for i in range(len(inventory_events) - 1):
            current_event = inventory_events[i]
            next_event = inventory_events[i + 1]
            
            duration = next_event.time - current_event.time
            total_weighted_inventory += current_event.charged_count * duration
        
        # Handle last event (until end of simulation)
        if inventory_events:
            last_event = inventory_events[-1]
            remaining_duration = simulation_duration - last_event.time
            total_weighted_inventory += last_event.charged_count * remaining_duration
        
        avg_inventory = total_weighted_inventory / simulation_duration if simulation_duration > 0 else 0.0
        
        return avg_inventory
    

