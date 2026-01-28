# Battery Swap Simulation Engine

A discrete-event simulation engine for modeling battery swap station network operations. Built with SimPy, this backend module supports baseline operations and what-if scenario analysis, producing decision-ready KPIs for network planning and optimization.

## Features

- **Discrete-Event Simulation**: SimPy-based engine modeling swap stations, demand arrivals, and charging operations
- **Station Modeling**: Configurable swap bays, chargers, inventory capacity, and operational parameters
- **Demand Generation**: Poisson arrival process with time-of-day and scenario multipliers
- **Scenario Analysis**: Apply deltas to baseline (add stations, modify chargers, demand surges)
- **KPI Calculation**: City and station-level metrics (wait time, lost swaps, utilization, throughput)
- **Baseline Validation**: Error band checking against reference KPIs

## Installation

### Prerequisites

- Python 3.8 or higher
- pip


## Quick Start

### Run Baseline Simulation

```bash
python run_baseline.py --config configs/baseline_example.yaml
```

This will:
1. Load the baseline configuration (4 stations)
2. Run a 24-hour simulation
3. Display city and station-level KPIs

### Run Scenario Analysis

```bash
# Festival scenario (1.5x demand)
python run_scenario.py --baseline configs/baseline_example.yaml --scenario configs/scenario_festival.yaml

# Network expansion scenario (add stations, upgrade chargers)
python run_scenario.py --baseline configs/baseline_example.yaml --scenario configs/scenario_expansion.yaml
```

### Validate Baseline

```bash
python run_baseline.py --config configs/baseline_example.yaml --validate
```

This checks if computed KPIs match reference values within error bands (±10-15%).

## Configuration

### Baseline Configuration

Baseline configs define the complete system state. Example structure:

```yaml
stations:
  - station_id: "WDL_01"
    tier: "high"           # high, medium, low
    bays: 4                # Parallel swap bays
    chargers: 6            # Parallel chargers
    inventory_capacity: 40
    lat: 28.66
    lon: 77.22
    initial_charged: 35

demand:
  base_rates:
    high: 20.0    # Arrivals per hour by tier
    medium: 12.0
    low: 6.0
  
  time_multipliers:        # Hourly demand patterns (0-23)
    9: 1.3                 # Morning peak
    18: 1.8                # Evening peak
  
  scenario_multiplier: 1.0

operations:
  swap_duration: 2.0       # minutes
  charge_duration: 60.0    # minutes
  replenishment_threshold: 0.2
  replenishment_amount: 10
  replenishment_delay: 30.0

simulation_duration: 1440.0  # 24 hours
random_seed: 42
```

### Scenario Configuration

Scenarios define changes (deltas) to apply to the baseline:

```yaml
name: "Festival Demand Surge"
description: "1.5x demand during festival period"

add_stations: []           # List of new stations
remove_station_ids: []     # IDs to remove
modify_stations:           # Modify existing stations
  WDL_01:
    chargers: 8            # Increase from 6 to 8

demand_multiplier: 1.5     # 50% increase

operations_override: {}    # Override operational params
```

## KPI Definitions

### City-Level KPIs

- **avg_wait_time**: Average customer wait time in queue (minutes)
- **lost_swaps_pct**: Percentage of swaps rejected due to no inventory
- **charger_utilization**: Fraction of time chargers are busy (0-1)
- **idle_inventory_pct**: Average excess charged inventory
- **throughput**: Successful swaps per hour
- **cost_proxy**: Weighted cost function (wait + lost swaps + idle resources)

### Station-Level KPIs

- **avg_wait_time**: Station-specific wait time
- **lost_swaps**: Number of rejected swaps
- **successful_swaps**: Completed swaps
- **bay_utilization**: Swap bay utilization (0-1)
- **charger_utilization**: Charger utilization (0-1)
- **avg_charged_inventory**: Time-averaged charged battery level

## Architecture

```
battery_swap_sim/
├── config/               # Configuration schemas and loaders
│   ├── schema.py         # Dataclasses for configs
│   └── loader.py         # YAML/JSON parsing
├── simulation/           # SimPy simulation engine
│   ├── station.py        # Station model with resources
│   ├── demand.py         # Poisson demand generator
│   └── engine.py         # Main simulation orchestrator
├── scenarios/            # Scenario delta application
│   └── applicator.py
├── kpis/                 # KPI computation
│   └── calculator.py
├── validation/           # Baseline validation
│   ├── baseline_validator.py
│   └── reference_kpis.yaml
├── configs/              # Example configurations
│   ├── baseline_example.yaml
│   ├── scenario_festival.yaml
│   └── scenario_expansion.yaml
├── run_baseline.py       # Baseline runner script
└── run_scenario.py       # Scenario comparison script
```

## CLI Reference

### run_baseline.py

```bash
python run_baseline.py [OPTIONS]

Options:
  --config PATH          Baseline config file (default: configs/baseline_example.yaml)
  --validate             Validate against reference KPIs
  --seed INT             Random seed (overrides config)
  --output PATH          Save results to JSON file
```

### run_scenario.py

```bash
python run_scenario.py [OPTIONS]

Options:
  --baseline PATH        Baseline config file (required)
  --scenario PATH        Scenario config file (required)
  --seed INT             Random seed
  --output PATH          Save comparison to JSON file
  --skip-baseline        Skip baseline run (scenario only)
```

## Validation Error Bands

Baseline validation uses these tolerances:

- **Wait Time**: ±15%
- **Lost Swaps**: ±15%
- **Charger Utilization**: ±10%

## Example Output

```
================================================================================
CITY-LEVEL KPIs
================================================================================
  Average Wait Time:      4.52 minutes
  Lost Swaps:             8.12% (47/579)
  Charger Utilization:    76.3%
  Idle Inventory:         14.2%
  Throughput:             44.2 swaps/hour
  Cost Proxy:             14.87

================================================================================
STATION-LEVEL KPIs
================================================================================

WDL_01 (high tier)
  Arrivals:               287
  Successful Swaps:       265
  Lost Swaps:             22 (7.7%)
  Avg Wait Time:          3.42 minutes
  Bay Utilization:        82.4%
  Charger Utilization:    78.9%
  Avg Charged Inventory:  12.4 batteries
```

## Assumptions

- **Demand**: Poisson arrivals, tier-dependent rates
- **Operations**: Fixed swap (2 min) and charge (60 min) durations
- **Batteries**: Identical, interchangeable
- **Replenishment**: Threshold-based policy
- **Simulation**: 24-hour window, deterministic with fixed seed

## Extending the Engine

### Add New Station Tier

Edit `demand.base_rates` in config:

```yaml
demand:
  base_rates:
    high: 20.0
    medium: 12.0
    low: 6.0
    custom_tier: 15.0  # New tier
```

### Add Custom KPIs

Edit `kpis/calculator.py` and extend `CityKPIs` or `StationKPIs` dataclasses.

### Custom Scenarios

Create new YAML files in `configs/` following the scenario schema.

## Troubleshooting

**Issue**: `ModuleNotFoundError: No module named 'simpy'`
- **Solution**: Run `pip install -r requirements.txt`

**Issue**: Validation fails with large variance
- **Solution**: Check random seed consistency, verify config matches reference baseline

**Issue**: Lost swaps = 100%
- **Solution**: Check initial charged inventory and charger count

## Contributing

This is a backend module with no UI. To extend:

1. Add new config parameters in `config/schema.py`
2. Update simulation logic in `simulation/` modules
3. Add KPIs in `kpis/calculator.py`
4. Create test scenarios in `configs/`

## License

Internal project for HackSmart team.
