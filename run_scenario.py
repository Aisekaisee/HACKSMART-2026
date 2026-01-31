#!/usr/bin/env python3
"""
Run scenario simulation and compare against baseline.

Usage:
    python run_scenario.py --baseline configs/baseline_example.yaml --scenario configs/scenario_festival.yaml
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory to path to allow imports
sys.path.insert(0, str(Path(__file__).parent))

from config.loader import ConfigLoader
from simulation.engine import SimulationEngine
from kpis.calculator import KPICalculator
from kpis.cost_model import CostModel, CostParameters
from scenarios.applicator import ScenarioApplicator


def main():
    parser = argparse.ArgumentParser(description="Run scenario simulation against baseline")
    parser.add_argument(
        "--baseline",
        type=str,
        default="configs/baseline_example.yaml",
        help="Path to baseline configuration file"
    )
    parser.add_argument(
        "--scenario",
        type=str,
        required=True,
        help="Path to scenario configuration file"
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Random seed (overrides config)"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Save comparison results to JSON file"
    )
    parser.add_argument(
        "--skip-baseline",
        action="store_true",
        help="Skip baseline run (for testing scenario config only)"
    )
    
    args = parser.parse_args()
    
    # Load baseline configuration
    print(f"\n{'='*60}")
    print(f"Loading baseline: {args.baseline}")
    print(f"{'='*60}\n")
    
    baseline_config = ConfigLoader.load_baseline(Path(args.baseline))
    
    if args.seed is not None:
        baseline_config.random_seed = args.seed
    
    baseline_kpis = None
    baseline_results = None
    
    if not args.skip_baseline:
        # Run baseline simulation
        print(f"Running BASELINE simulation...")
        print(f"  Stations: {len(baseline_config.stations)}")
        
        baseline_engine = SimulationEngine(baseline_config)
        baseline_results = baseline_engine.run()
        baseline_kpis = KPICalculator.calculate(
            baseline_results,
            swap_duration=baseline_config.operations.swap_duration,
            charge_duration=baseline_config.operations.charge_duration
        )
        
        print("Baseline complete!\n")
    
    # Load scenario configuration
    print(f"{'='*60}")
    print(f"Loading scenario: {args.scenario}")
    print(f"{'='*60}\n")
    
    scenario_config = ConfigLoader.load_scenario(Path(args.scenario))
    print(f"Scenario: {scenario_config.name}")
    print(f"Description: {scenario_config.description}\n")
    
    # Apply scenario to baseline
    print("Applying scenario changes...")
    modified_config = ScenarioApplicator.apply_scenario(baseline_config, scenario_config)
    
    print(f"  Stations after scenario: {len(modified_config.stations)}")
    if scenario_config.demand_multiplier:
        print(f"  Demand multiplier: {scenario_config.demand_multiplier}x")
    print()
    
    # Run scenario simulation
    print(f"{'='*60}")
    print("Running SCENARIO simulation...")
    print(f"{'='*60}\n")
    
    scenario_engine = SimulationEngine(modified_config)
    scenario_results = scenario_engine.run()
    scenario_kpis = KPICalculator.calculate(
        scenario_results,
        swap_duration=modified_config.operations.swap_duration,
        charge_duration=modified_config.operations.charge_duration
    )
    
    print("Scenario complete!\n")
    
    # Calculate cost breakdown
    cost_model = CostModel()
    
    baseline_costs = None
    if not args.skip_baseline and baseline_results:
        baseline_costs = cost_model.calculate_costs(baseline_results, baseline_config)
    
    scenario_costs = cost_model.calculate_costs(scenario_results, modified_config)
    
    # Display comparison
    print_comparison(baseline_kpis, scenario_kpis, scenario_config.name)
    
    # Display cost comparison
    if baseline_costs and scenario_costs:
        cost_deltas = cost_model.calculate_cost_delta(baseline_costs, scenario_costs)
        CostModel.print_cost_comparison(baseline_costs, scenario_costs, cost_deltas)
    
    # Save output if requested
    if args.output:
        output_data = {
            "scenario_name": scenario_config.name,
            "scenario_description": scenario_config.description,
            "baseline_kpis": baseline_kpis,
            "scenario_kpis": scenario_kpis,
            "baseline_costs": baseline_costs.to_dict() if baseline_costs else None,
            "scenario_costs": scenario_costs.to_dict() if scenario_costs else None,
            "cost_deltas": cost_deltas if baseline_costs and scenario_costs else None
        }
        
        output_path = Path(args.output)
        with open(output_path, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"\nResults saved to: {output_path}")


def print_comparison(baseline_kpis: dict, scenario_kpis: dict, scenario_name: str):
    """Print side-by-side comparison of baseline vs scenario."""
    print("\n" + "="*80)
    print(f"COMPARISON: Baseline vs {scenario_name}")
    print("="*80)
    
    if baseline_kpis is None:
        print("\n(Baseline skipped - showing scenario results only)\n")
        print_scenario_only(scenario_kpis)
        return
    
    base_city = baseline_kpis["city_kpis"]
    scen_city = scenario_kpis["city_kpis"]
    
    print(f"\n{'Metric':<30} {'Baseline':>15} {'Scenario':>15} {'Change':>15}")
    print("-" * 80)
    
    # Wait time
    wait_change = scen_city['avg_wait_time'] - base_city['avg_wait_time']
    wait_pct = (wait_change / base_city['avg_wait_time'] * 100) if base_city['avg_wait_time'] > 0 else 0
    print(f"{'Avg Wait Time (min)':<30} {base_city['avg_wait_time']:>15.2f} {scen_city['avg_wait_time']:>15.2f} {format_change(wait_change, wait_pct, 'lower')}")
    
    # Lost swaps
    lost_change = scen_city['lost_swaps_pct'] - base_city['lost_swaps_pct']
    lost_pct = (lost_change / base_city['lost_swaps_pct'] * 100) if base_city['lost_swaps_pct'] > 0 else 0
    print(f"{'Lost Swaps (%)':<30} {base_city['lost_swaps_pct']:>15.2f} {scen_city['lost_swaps_pct']:>15.2f} {format_change(lost_change, lost_pct, 'lower')}")
    
    # Charger utilization
    util_change = scen_city['charger_utilization'] - base_city['charger_utilization']
    util_pct = (util_change / base_city['charger_utilization'] * 100) if base_city['charger_utilization'] > 0 else 0
    print(f"{'Charger Utilization':<30} {base_city['charger_utilization']:>15.3f} {scen_city['charger_utilization']:>15.3f} {format_change(util_change, util_pct, 'balanced')}")
    
    # Throughput
    thru_change = scen_city['throughput'] - base_city['throughput']
    thru_pct = (thru_change / base_city['throughput'] * 100) if base_city['throughput'] > 0 else 0
    print(f"{'Throughput (swaps/hr)':<30} {base_city['throughput']:>15.1f} {scen_city['throughput']:>15.1f} {format_change(thru_change, thru_pct, 'higher')}")
    
    # Cost proxy
    cost_change = scen_city['cost_proxy'] - base_city['cost_proxy']
    cost_pct = (cost_change / base_city['cost_proxy'] * 100) if base_city['cost_proxy'] > 0 else 0
    print(f"{'Cost Proxy':<30} {base_city['cost_proxy']:>15.2f} {scen_city['cost_proxy']:>15.2f} {format_change(cost_change, cost_pct, 'lower')}")
    
    print("\n" + "="*80)
    
    # Station count comparison
    base_station_count = len(baseline_kpis["stations"])
    scen_station_count = len(scenario_kpis["stations"])
    
    if base_station_count != scen_station_count:
        print(f"\nStation count: {base_station_count} → {scen_station_count}")
    
    print()


def print_scenario_only(scenario_kpis: dict):
    """Print scenario results without comparison."""
    city = scenario_kpis["city_kpis"]
    
    print("\nCITY-LEVEL KPIs")
    print("-" * 60)
    print(f"  Average Wait Time:      {city['avg_wait_time']:.2f} minutes")
    print(f"  Lost Swaps:             {city['lost_swaps_pct']:.2f}%")
    print(f"  Charger Utilization:    {city['charger_utilization']:.1%}")
    print(f"  Throughput:             {city['throughput']:.1f} swaps/hour")
    print(f"  Cost Proxy:             {city['cost_proxy']:.2f}")
    print()


def format_change(absolute_change: float, percent_change: float, better_direction: str) -> str:
    """Format change with color indicator (text-based)."""
    if abs(absolute_change) < 0.01:
        return f"{absolute_change:>+7.2f} (no change)"
    
    # Determine if change is positive or negative outcome
    is_improvement = False
    if better_direction == 'lower' and absolute_change < 0:
        is_improvement = True
    elif better_direction == 'higher' and absolute_change > 0:
        is_improvement = True
    elif better_direction == 'balanced' and abs(percent_change) < 5:
        is_improvement = True
    
    indicator = "✓" if is_improvement else "⚠"
    return f"{absolute_change:>+7.2f} ({percent_change:>+5.1f}%) {indicator}"


if __name__ == "__main__":
    main()
