#!/usr/bin/env python3
"""
Run baseline simulation and display KPIs.

Usage:
    python run_baseline.py --config configs/baseline_example.yaml [--validate] [--seed SEED]
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
from validation.baseline_validator import BaselineValidator


def main():
    parser = argparse.ArgumentParser(description="Run baseline battery swap simulation")
    parser.add_argument(
        "--config",
        type=str,
        default="configs/baseline_example.yaml",
        help="Path to baseline configuration file"
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate results against reference KPIs"
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Random seed (overrides config)"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Save results to JSON file"
    )
    
    args = parser.parse_args()
    
    # Load configuration
    print(f"\n{'='*60}")
    print(f"Loading baseline configuration: {args.config}")
    print(f"{'='*60}\n")
    
    config_path = Path(args.config)
    baseline_config = ConfigLoader.load_baseline(config_path)
    
    # Override seed if provided
    if args.seed is not None:
        baseline_config.random_seed = args.seed
    
    print(f"Configuration loaded:")
    print(f"  Stations: {len(baseline_config.stations)}")
    print(f"  Simulation duration: {baseline_config.simulation_duration} minutes")
    print(f"  Random seed: {baseline_config.random_seed}")
    
    # Run simulation
    print(f"\n{'='*60}")
    print("Running simulation...")
    print(f"{'='*60}\n")
    
    engine = SimulationEngine(baseline_config)
    results = engine.run()
    
    print("Simulation complete!")
    
    # Calculate KPIs
    print(f"\n{'='*60}")
    print("Calculating KPIs...")
    print(f"{'='*60}\n")
    
    kpis = KPICalculator.calculate(results)
    
    # Calculate cost breakdown
    cost_model = CostModel()
    cost_breakdown = cost_model.calculate_costs(results, baseline_config)
    
    # Display results
    print_kpis(kpis)
    CostModel.print_cost_breakdown(cost_breakdown)
    
    # Validate if requested
    if args.validate:
        reference_path = Path(__file__).parent / "validation" / "reference_kpis.yaml"
        
        if reference_path.exists():
            print(f"\n{'='*60}")
            print("Validating against reference KPIs...")
            print(f"{'='*60}")
            
            reference_kpis = BaselineValidator.load_reference_kpis(reference_path)
            passed, report = BaselineValidator.validate(kpis, reference_kpis)
            BaselineValidator.print_report(report)
        else:
            print(f"\nWarning: Reference KPIs file not found at {reference_path}")
    
    # Save output if requested
    if args.output:
        output_data = {
            "kpis": kpis,
            "costs": cost_breakdown.to_dict()
        }
        output_path = Path(args.output)
        with open(output_path, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"\nResults saved to: {output_path}")


def print_kpis(kpis: dict):
    """Pretty print KPIs."""
    city = kpis["city_kpis"]
    
    print("\n" + "="*60)
    print("CITY-LEVEL KPIs")
    print("="*60)
    print(f"  Average Wait Time:      {city['avg_wait_time']:.2f} minutes")
    print(f"  Lost Swaps:             {city['lost_swaps_pct']:.2f}% ({city['total_lost']}/{city['total_arrivals']})")
    print(f"  Charger Utilization:    {city['charger_utilization']:.1%}")
    print(f"  Idle Inventory:         {city['idle_inventory_pct']:.1f}%")
    print(f"  Throughput:             {city['throughput']:.1f} swaps/hour")
    print(f"  Cost Proxy:             {city['cost_proxy']:.2f}")
    
    print("\n" + "="*60)
    print("STATION-LEVEL KPIs")
    print("="*60)
    
    for station in kpis["stations"]:
        print(f"\n{station['station_id']} ({station['tier']} tier)")
        print(f"  Arrivals:               {station['total_arrivals']}")
        print(f"  Successful Swaps:       {station['successful_swaps']}")
        print(f"  Lost Swaps:             {station['lost_swaps']} ({station['lost_swaps_pct']:.1f}%)")
        print(f"  Avg Wait Time:          {station['avg_wait_time']:.2f} minutes")
        print(f"  Bay Utilization:        {station['bay_utilization']:.1%}")
        print(f"  Charger Utilization:    {station['charger_utilization']:.1%}")
        print(f"  Avg Charged Inventory:  {station['avg_charged_inventory']:.1f} batteries")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    main()
