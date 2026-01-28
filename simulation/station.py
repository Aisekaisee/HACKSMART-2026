"""Station model with SimPy resources for swap bays, chargers, and inventory."""

import simpy
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class SwapEvent:
    """Record of a swap event."""
    time: float
    station_id: str
    event_type: str  # "arrival", "swap_start", "swap_end", "rejected"
    customer_id: int
    wait_time: float = 0.0


@dataclass
class ChargeEvent:
    """Record of a charging event."""
    time: float
    station_id: str
    event_type: str  # "charge_start", "charge_end"
    

@dataclass
class InventoryEvent:
    """Record of inventory change."""
    time: float
    station_id: str
    charged_count: int
    depleted_count: int


class Station:
    """Model of a battery swap station with SimPy resources."""
    
    def __init__(
        self,
        env: simpy.Environment,
        station_id: str,
        tier: str,
        bays: int,
        chargers: int,
        inventory_capacity: int,
        initial_charged: int,
        swap_duration: float,
        charge_duration: float,
        replenishment_threshold: float,
        replenishment_amount: int,
        replenishment_delay: float
    ):
        """Initialize station with SimPy resources."""
        self.env = env
        self.station_id = station_id
        self.tier = tier
        
        # Resources
        self.swap_bays = simpy.Resource(env, capacity=bays)
        self.chargers = simpy.Resource(env, capacity=chargers)
        
        # Inventory
        self.inventory_capacity = inventory_capacity
        self.charged_batteries = initial_charged
        self.depleted_batteries = 0
        
        # Operational parameters
        self.swap_duration = swap_duration
        self.charge_duration = charge_duration
        self.replenishment_threshold = replenishment_threshold
        self.replenishment_amount = replenishment_amount
        self.replenishment_delay = replenishment_delay
        
        # Statistics
        self.total_arrivals = 0
        self.successful_swaps = 0
        self.rejected_swaps = 0
        self.total_wait_time = 0.0
        
        # Event logs
        self.swap_events: List[SwapEvent] = []
        self.charge_events: List[ChargeEvent] = []
        self.inventory_events: List[InventoryEvent] = []
        
        # Initialize charging process if chargers available
        if chargers > 0:
            for i in range(chargers):
                env.process(self._charger_process(i))
        
        # Log initial inventory
        self._log_inventory()
    
    def process_swap(self, customer_id: int):
        """Process a swap request (SimPy process)."""
        arrival_time = self.env.now
        self.total_arrivals += 1
        
        # Log arrival
        self.swap_events.append(SwapEvent(
            time=arrival_time,
            station_id=self.station_id,
            event_type="arrival",
            customer_id=customer_id
        ))
        
        # Check if charged battery available
        if self.charged_batteries <= 0:
            # Reject swap
            self.rejected_swaps += 1
            self.swap_events.append(SwapEvent(
                time=self.env.now,
                station_id=self.station_id,
                event_type="rejected",
                customer_id=customer_id,
                wait_time=0.0
            ))
            return
        
        # Request swap bay
        with self.swap_bays.request() as bay_request:
            yield bay_request
            
            # Calculate wait time
            swap_start_time = self.env.now
            wait_time = swap_start_time - arrival_time
            self.total_wait_time += wait_time
            
            # Log swap start
            self.swap_events.append(SwapEvent(
                time=swap_start_time,
                station_id=self.station_id,
                event_type="swap_start",
                customer_id=customer_id,
                wait_time=wait_time
            ))
            
            # Perform swap
            yield self.env.timeout(self.swap_duration)
            
            # Update inventory
            self.charged_batteries -= 1
            self.depleted_batteries += 1
            self.successful_swaps += 1
            
            # Log swap end
            self.swap_events.append(SwapEvent(
                time=self.env.now,
                station_id=self.station_id,
                event_type="swap_end",
                customer_id=customer_id,
                wait_time=wait_time
            ))
            
            self._log_inventory()
            
            # Check if replenishment needed
            if self.charged_batteries < self.inventory_capacity * self.replenishment_threshold:
                self.env.process(self._replenish())
    
    def _charger_process(self, charger_id: int):
        """Individual charger process - continuously charges depleted batteries."""
        while True:
            # Wait until depleted batteries are available
            if self.depleted_batteries > 0:
                # Start charging
                charge_start = self.env.now
                self.charge_events.append(ChargeEvent(
                    time=charge_start,
                    station_id=self.station_id,
                    event_type="charge_start"
                ))
                
                # Move one battery from depleted to charging
                self.depleted_batteries -= 1
                
                # Wait for charge duration
                yield self.env.timeout(self.charge_duration)
                
                # Complete charging
                self.charged_batteries += 1
                self.charge_events.append(ChargeEvent(
                    time=self.env.now,
                    station_id=self.station_id,
                    event_type="charge_end"
                ))
                
                self._log_inventory()
            else:
                # No depleted batteries, wait a bit
                yield self.env.timeout(1.0)  # Check every minute
    
    def _replenish(self):
        """Replenish inventory with fresh charged batteries."""
        yield self.env.timeout(self.replenishment_delay)
        
        # Add batteries up to capacity
        available_space = self.inventory_capacity - (self.charged_batteries + self.depleted_batteries)
        actual_amount = min(self.replenishment_amount, available_space)
        
        self.charged_batteries += actual_amount
        self._log_inventory()
    
    def _log_inventory(self):
        """Log current inventory state."""
        self.inventory_events.append(InventoryEvent(
            time=self.env.now,
            station_id=self.station_id,
            charged_count=self.charged_batteries,
            depleted_count=self.depleted_batteries
        ))
    
    def get_stats_summary(self) -> Dict[str, Any]:
        """Get summary statistics for this station."""
        avg_wait = self.total_wait_time / self.successful_swaps if self.successful_swaps > 0 else 0.0
        
        return {
            "station_id": self.station_id,
            "tier": self.tier,
            "total_arrivals": self.total_arrivals,
            "successful_swaps": self.successful_swaps,
            "rejected_swaps": self.rejected_swaps,
            "avg_wait_time": round(avg_wait, 2),
            "rejection_rate": round(self.rejected_swaps / self.total_arrivals, 3) if self.total_arrivals > 0 else 0.0
        }
