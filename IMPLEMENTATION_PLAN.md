# Implementation Plan: New Station Constraints & Queuing Logic

Based on the new information, we need to fundamentally shift the simulation logic from a "Bay-Constrained" model to a "Battery-Constrained" model.

## 1. Core Constraint Changes

| Feature | Old Logic | New Logic |
| :--- | :--- | :--- |
| **Swap Bays** | `bays` defined concurrency. Users queued for a parking spot. | **Removed**. No limit on concurrent swaps (physical space assumed sufficient). |
| **Queue Source** | Waiting for a Bay. | **Waiting for a Charged Battery**. |
| **Wait Condition** | All bays occupied. | **Inventory (Charged Batteries) = 0**. |
| **Inventory** | `capacity` could be > `chargers`. | **`capacity` == `chargers`**. Every battery has a dedicated charger slot. |
| **Rejection** | (Often) Rejected if no battery. | **Queueing**. Users wait for the next battery to charge (optional: can still reject if queue > N). |
| **Charging** | 60 mins. | **210 - 240 mins (3.5 - 4 hours)**. |

## 2. Modified Simulation Logic (`station.py`)

We will rewrite the `Station` class to prioritize battery availability.

### A. Arrival Process
1.  **User Arrives**.
2.  **Check Charged Inventory**:
    *   **If `charged > 0`**:
        *   Decrement `charged`.
        *   Proceed to Swap (Travel time/Swap duration).
        *   Induce `Swap Duration` (e.g., 2 mins).
        *   **On Swap Complete**:
            *   User leaves with Charged Battery.
            *   Station receives Depleted Battery.
            *   **Immediate Action**: Start charging the depleted battery (since `slots == batteries`, a charger is always available).
    *   **If `charged == 0`**:
        *   **Join Queue** (`waiting_for_battery`).
        *   User waits until a charging process completes.
        *   **Wait Time** accumulates.

### B. Charging Process
*   Since `batteries == chargers`, we don't need a complex resource for chargers.
*   Every time a swap completes (Depleted battery received), we spawn a **Charging Task**:
    *   `yield env.timeout(charge_duration)` (3-4 hours).
    *   Increment `charged`.
    *   **Check Queue**: If users are waiting, assign this newly charged battery to the first in line (process their swap immediately).

## 3. Metric & KPI Updates

*   **Wait Time**: Will now explicitly measure "Time spent waiting for a battery to charge". given the long charge times, this could be high if the station runs dry.
*   **Queue Depth**: Now represents "People waiting for batteries", not "People waiting for bays".
*   **Bay Utilization**: Removed.
*   **Charger Utilization**: Can be calculated as `(Total Charging Minutes) / (Total Simulation Time * N_Chargers)`.

## 4. Proposed Code Modifications

### `config/schema.py`
*   Remove `bays`.
*   Enforce `inventory_capacity == chargers`.
*   Update default `charge_duration` to `210.0` (3.5h).

### `simulation/station.py`
*   Remove `self.swap_bays = simpy.Resource(...)`.
*   Implement `self.battery_queue`.
*   Change `process_swap` to block on battery availability event.

### `api/models.py`
*   Remove `bay_utilization` from KPI models.

---

**Does this plan align with your understanding? Should we implement the "Queue for Battery" logic effectively allowing infinite waiting, or should we keep a "Max Queue Size" before rejection?**
