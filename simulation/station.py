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
        # bays: int, # Removed
        chargers: int,
        inventory_capacity: int,
        initial_charged: int,
        swap_duration: float,
        charge_duration: float,
        replenishment_threshold: float,
        replenishment_amount: int,
        replenishment_delay: float,
        max_wait_time: float = 15.0  # Max wait time in minutes before customer leaves
    ):
        """Initialize station with SimPy resources."""
        self.env = env
        self.station_id = station_id
        self.tier = tier

        # Resources
        # self.swap_bays = simpy.Resource(env, capacity=bays) # Removed
        # self.chargers = simpy.Resource(env, capacity=chargers) # Implicit in having inventory=chargers

        # Inventory Management
        # We use a Container to separate "Available Charged" from "Depleted/Charging".
        # Capacity is the total number of physical batteries (which equals chargers).
        self.inventory_capacity = chargers
        initial_level = min(initial_charged, chargers)
        self.charged_store = simpy.Container(
            env, capacity=chargers, init=initial_level)

        # Track depleted count only for logging/stats (logic is handled by the store wait)
        self.depleted_count = chargers - initial_level
        self.charging_count = 0  # Batteries currently in charge cycle

        # Operational parameters
        self.swap_duration = swap_duration
        self.charge_duration = charge_duration
        self.replenishment_threshold = replenishment_threshold
        self.replenishment_amount = replenishment_amount
        self.replenishment_delay = replenishment_delay
        self.max_wait_time = max_wait_time  # Customer leaves if wait exceeds this

        # Statistics
        self.total_arrivals = 0
        self.successful_swaps = 0
        self.rejected_swaps = 0
        self.total_wait_time = 0.0

        # Event logs
        self.swap_events: List[SwapEvent] = []
        self.charge_events: List[ChargeEvent] = []
        self.inventory_events: List[InventoryEvent] = []

        # Initialize charging for any initially depleted batteries?
        # If we start with depleted batteries, they should probably be charging.
        if self.depleted_count > 0:
            # Spawn charge cycles for initial empty slots
            for _ in range(self.depleted_count):
                env.process(self._charge_cycle())

        # Log initial inventory
        self._log_inventory()

    def process_swap(self, customer_id: int):
        """Process a swap request (SimPy process).

        Customer waits up to max_wait_time for a battery. If no battery
        becomes available within that time, the customer leaves (lost swap).
        """
        arrival_time = self.env.now
        self.total_arrivals += 1

        # Log arrival
        self.swap_events.append(SwapEvent(
            time=arrival_time,
            station_id=self.station_id,
            event_type="arrival",
            customer_id=customer_id
        ))

        # Try to get a battery with timeout (customer patience)
        swap_req_time = self.env.now

        # Use simpy's timeout to implement customer patience
        battery_request = self.charged_store.get(1)
        timeout_event = self.env.timeout(self.max_wait_time)

        # Wait for either battery or timeout
        result = yield battery_request | timeout_event

        if battery_request in result:
            # Battery acquired within patience time
            battery_acquire_time = self.env.now
            wait_time = battery_acquire_time - swap_req_time
            self.total_wait_time += wait_time

            # Log Swap Start
            self.swap_events.append(SwapEvent(
                time=self.env.now,
                station_id=self.station_id,
                event_type="swap_start",
                customer_id=customer_id,
                wait_time=wait_time
            ))

            # Perform Swap Operation
            yield self.env.timeout(self.swap_duration)

            self.successful_swaps += 1
            self.depleted_count += 1  # Received a depleted battery

            # Log Swap End
            self.swap_events.append(SwapEvent(
                time=self.env.now,
                station_id=self.station_id,
                event_type="swap_end",
                customer_id=customer_id,
                wait_time=wait_time
            ))

            self._log_inventory()

            # Start Charging the received depleted battery immediately
            self.env.process(self._charge_cycle())
        else:
            # Timeout occurred - customer leaves (lost swap)
            # Cancel the pending battery request if it hasn't been fulfilled
            if not battery_request.triggered:
                battery_request.cancel()

            self.rejected_swaps += 1

            # Log rejection
            self.swap_events.append(SwapEvent(
                time=self.env.now,
                station_id=self.station_id,
                event_type="rejected",
                customer_id=customer_id,
                wait_time=self.max_wait_time
            ))

    def _charge_cycle(self):
        """Process for charging a single battery independently."""
        # Log Start
        self.charge_events.append(ChargeEvent(
            time=self.env.now,
            station_id=self.station_id,
            event_type="charge_start"
        ))

        self.charging_count += 1

        # Simulate Charge Duration
        yield self.env.timeout(self.charge_duration)

        # Log End
        self.charge_events.append(ChargeEvent(
            time=self.env.now,
            station_id=self.station_id,
            event_type="charge_end"
        ))

        self.charging_count -= 1
        self.depleted_count -= 1  # It's now charged

        # Put back into store (making it available for waiting customers)
        yield self.charged_store.put(1)
        self._log_inventory()

    # Replenishment removed/commented out as it conflicts with closed-loop battery=charger constraint for now
    # def _replenish(self): ...

    def _log_inventory(self):
        """Log current inventory state."""
        self.inventory_events.append(InventoryEvent(
            time=self.env.now,
            station_id=self.station_id,
            charged_count=self.charged_store.level,
            depleted_count=self.depleted_count
        ))

    def get_stats_summary(self) -> Dict[str, Any]:
        """Get summary statistics for this station."""
        avg_wait = self.total_wait_time / \
            self.successful_swaps if self.successful_swaps > 0 else 0.0

        return {
            "station_id": self.station_id,
            "tier": self.tier,
            "total_arrivals": self.total_arrivals,
            "successful_swaps": self.successful_swaps,
            "rejected_swaps": self.rejected_swaps,
            "avg_wait_time": round(avg_wait, 2),
            "rejection_rate": round(self.rejected_swaps / self.total_arrivals, 3) if self.total_arrivals > 0 else 0.0,
            "inventory_capacity": self.inventory_capacity  # For KPI percentage calculations
        }
