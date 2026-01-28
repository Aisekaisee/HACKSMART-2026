"""
Enhanced cost modeling for battery swap network operations.

Provides detailed cost breakdown including capital, operational, and opportunity costs.
"""

from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class CostParameters:
    """Cost parameters for network operations (all in ₹)."""
    
    # Capital costs (one-time)
    cost_per_charger: float = 50000.0  # ₹50k per charger
    cost_per_bay: float = 25000.0      # ₹25k per swap bay
    cost_per_battery: float = 15000.0  # ₹15k per battery (inventory)
    
    # Operational costs (per event/hour)
    cost_per_swap: float = 20.0        # ₹20 per swap operation
    cost_per_replenishment: float = 500.0  # ₹500 per replenishment event
    electricity_cost_per_charge: float = 30.0  # ₹30 per battery charge
    labor_cost_per_hour: float = 200.0  # ₹200/hr per station
    
    # Opportunity costs
    revenue_per_swap: float = 150.0    # ₹150 revenue per successful swap
    
    # Operating costs (annual, prorated to 24hr)
    maintenance_cost_per_charger_daily: float = 50.0  # ₹50/day per charger
    

@dataclass
class CostBreakdown:
    """Detailed cost breakdown for simulation period."""
    
    # Capital costs
    charger_capital: float
    bay_capital: float
    inventory_capital: float
    total_capital: float
    
    # Operational costs (24hr period)
    swap_operations_cost: float
    charging_cost: float
    labor_cost: float
    maintenance_cost: float
    replenishment_cost: float
    total_operational: float
    
    # Opportunity costs
    lost_revenue: float  # Revenue lost due to lost swaps
    
    # Revenue
    total_revenue: float
    
    # Net impact
    net_operational_profit: float  # Revenue - operational costs
    total_cost: float  # Capital + operational + opportunity
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary for serialization."""
        return {
            "capital": {
                "chargers": round(self.charger_capital, 2),
                "bays": round(self.bay_capital, 2),
                "inventory": round(self.inventory_capital, 2),
                "total": round(self.total_capital, 2)
            },
            "operational_24hr": {
                "swap_operations": round(self.swap_operations_cost, 2),
                "electricity": round(self.charging_cost, 2),
                "labor": round(self.labor_cost, 2),
                "maintenance": round(self.maintenance_cost, 2),
                "replenishment": round(self.replenishment_cost, 2),
                "total": round(self.total_operational, 2)
            },
            "opportunity": {
                "lost_revenue": round(self.lost_revenue, 2)
            },
            "revenue": {
                "total": round(self.total_revenue, 2)
            },
            "summary": {
                "net_operational_profit": round(self.net_operational_profit, 2),
                "total_cost": round(self.total_cost, 2)
            }
        }


class CostModel:
    """Calculate detailed cost breakdown for simulation results."""
    
    def __init__(self, params: CostParameters = None):
        """Initialize with cost parameters."""
        self.params = params or CostParameters()
    
    def calculate_costs(
        self,
        simulation_results: Dict[str, Any],
        baseline_config: Any
    ) -> CostBreakdown:
        """
        Calculate comprehensive cost breakdown.
        
        Args:
            simulation_results: Results from simulation engine
            baseline_config: Configuration used for simulation
            
        Returns:
            CostBreakdown with all cost components
        """
        # Extract metrics from results
        stations = simulation_results.get("stations", [])
        
        # Calculate capital costs from baseline configuration
        total_chargers = sum(s.chargers for s in baseline_config.stations)
        total_bays = sum(s.bays for s in baseline_config.stations)
        total_inventory = sum(s.inventory_capacity for s in baseline_config.stations)
        
        charger_capital = total_chargers * self.params.cost_per_charger
        bay_capital = total_bays * self.params.cost_per_bay
        inventory_capital = total_inventory * self.params.cost_per_battery
        total_capital = charger_capital + bay_capital + inventory_capital
        
        # Calculate operational costs (24hr simulation period)
        total_successful_swaps = sum(s["stats"]["successful_swaps"] for s in stations)
        total_lost_swaps = sum(s["stats"]["rejected_swaps"] for s in stations)
        
        # Estimate charge events (approximately equal to successful swaps)
        total_charge_events = total_successful_swaps
        
        # Estimate replenishment events (rough approximation)
        # Assume replenishment triggered when inventory drops below threshold
        # For simplicity: 1 replenishment per station per 8 hours
        num_stations = len(baseline_config.stations)
        replenishment_events = num_stations * 3  # 3 times in 24 hours
        
        swap_operations_cost = total_successful_swaps * self.params.cost_per_swap
        charging_cost = total_charge_events * self.params.electricity_cost_per_charge
        labor_cost = num_stations * self.params.labor_cost_per_hour * 24  # 24 hours
        maintenance_cost = total_chargers * self.params.maintenance_cost_per_charger_daily
        replenishment_cost = replenishment_events * self.params.cost_per_replenishment
        
        total_operational = (
            swap_operations_cost + 
            charging_cost + 
            labor_cost + 
            maintenance_cost + 
            replenishment_cost
        )
        
        # Calculate opportunity cost (lost revenue)
        lost_revenue = total_lost_swaps * self.params.revenue_per_swap
        
        # Calculate revenue
        total_revenue = total_successful_swaps * self.params.revenue_per_swap
        
        # Calculate net metrics
        net_operational_profit = total_revenue - total_operational
        total_cost = total_capital + total_operational + lost_revenue
        
        return CostBreakdown(
            charger_capital=charger_capital,
            bay_capital=bay_capital,
            inventory_capital=inventory_capital,
            total_capital=total_capital,
            swap_operations_cost=swap_operations_cost,
            charging_cost=charging_cost,
            labor_cost=labor_cost,
            maintenance_cost=maintenance_cost,
            replenishment_cost=replenishment_cost,
            total_operational=total_operational,
            lost_revenue=lost_revenue,
            total_revenue=total_revenue,
            net_operational_profit=net_operational_profit,
            total_cost=total_cost
        )
    
    def calculate_cost_delta(
        self,
        baseline_costs: CostBreakdown,
        scenario_costs: CostBreakdown
    ) -> Dict[str, float]:
        """
        Calculate cost difference between baseline and scenario.
        
        Returns:
            Dict with delta metrics (scenario - baseline)
        """
        return {
            "capital_delta": scenario_costs.total_capital - baseline_costs.total_capital,
            "operational_delta": scenario_costs.total_operational - baseline_costs.total_operational,
            "lost_revenue_delta": scenario_costs.lost_revenue - baseline_costs.lost_revenue,
            "revenue_delta": scenario_costs.total_revenue - baseline_costs.total_revenue,
            "profit_delta": scenario_costs.net_operational_profit - baseline_costs.net_operational_profit,
            "total_cost_delta": scenario_costs.total_cost - baseline_costs.total_cost
        }
    
    @staticmethod
    def print_cost_breakdown(costs: CostBreakdown, label: str = ""):
        """Pretty print cost breakdown."""
        print(f"\n{'='*60}")
        print(f"COST BREAKDOWN{' - ' + label if label else ''}")
        print(f"{'='*60}")
        
        print("\nCAPITAL COSTS (One-time Investment)")
        print(f"  Chargers:           ₹{costs.charger_capital:>12,.0f}")
        print(f"  Swap Bays:          ₹{costs.bay_capital:>12,.0f}")
        print(f"  Battery Inventory:  ₹{costs.inventory_capital:>12,.0f}")
        print(f"  {'─'*40}")
        print(f"  Total Capital:      ₹{costs.total_capital:>12,.0f}")
        
        print("\nOPERATIONAL COSTS (24-hour period)")
        print(f"  Swap Operations:    ₹{costs.swap_operations_cost:>12,.0f}")
        print(f"  Electricity:        ₹{costs.charging_cost:>12,.0f}")
        print(f"  Labor:              ₹{costs.labor_cost:>12,.0f}")
        print(f"  Maintenance:        ₹{costs.maintenance_cost:>12,.0f}")
        print(f"  Replenishment:      ₹{costs.replenishment_cost:>12,.0f}")
        print(f"  {'─'*40}")
        print(f"  Total Operational:  ₹{costs.total_operational:>12,.0f}")
        
        print("\nREVENUE & OPPORTUNITY")
        print(f"  Total Revenue:      ₹{costs.total_revenue:>12,.0f}")
        print(f"  Lost Revenue:       ₹{costs.lost_revenue:>12,.0f}")
        
        print("\nSUMMARY")
        print(f"  Net Profit (24hr):  ₹{costs.net_operational_profit:>12,.0f}")
        print(f"  Total Cost:         ₹{costs.total_cost:>12,.0f}")
        print(f"{'='*60}\n")
    
    @staticmethod
    def print_cost_comparison(
        baseline_costs: CostBreakdown,
        scenario_costs: CostBreakdown,
        deltas: Dict[str, float]
    ):
        """Print side-by-side cost comparison."""
        print(f"\n{'='*80}")
        print("COST COMPARISON: Baseline vs Scenario")
        print(f"{'='*80}")
        
        print(f"\n{'Metric':<30} {'Baseline':>15} {'Scenario':>15} {'Delta':>15}")
        print("─" * 80)
        
        print(f"{'Capital Investment':<30} ₹{baseline_costs.total_capital:>13,.0f} ₹{scenario_costs.total_capital:>13,.0f} ₹{deltas['capital_delta']:>+13,.0f}")
        print(f"{'Operational (24hr)':<30} ₹{baseline_costs.total_operational:>13,.0f} ₹{scenario_costs.total_operational:>13,.0f} ₹{deltas['operational_delta']:>+13,.0f}")
        print(f"{'Revenue (24hr)':<30} ₹{baseline_costs.total_revenue:>13,.0f} ₹{scenario_costs.total_revenue:>13,.0f} ₹{deltas['revenue_delta']:>+13,.0f}")
        print(f"{'Lost Revenue':<30} ₹{baseline_costs.lost_revenue:>13,.0f} ₹{scenario_costs.lost_revenue:>13,.0f} ₹{deltas['lost_revenue_delta']:>+13,.0f}")
        print(f"{'Net Profit (24hr)':<30} ₹{baseline_costs.net_operational_profit:>13,.0f} ₹{scenario_costs.net_operational_profit:>13,.0f} ₹{deltas['profit_delta']:>+13,.0f}")
        
        # Calculate ROI if capital investment increased
        if deltas['capital_delta'] > 0 and deltas['profit_delta'] > 0:
            # Daily profit increase
            daily_profit_increase = deltas['profit_delta']
            # Approximate payback period in days
            payback_days = deltas['capital_delta'] / daily_profit_increase if daily_profit_increase > 0 else float('inf')
            print(f"\n  → Additional Investment: ₹{deltas['capital_delta']:,.0f}")
            print(f"  → Daily Profit Increase: ₹{daily_profit_increase:,.0f}")
            print(f"  → Payback Period: ~{payback_days:.0f} days ({payback_days/30:.1f} months)")
        
        print(f"{'='*80}\n")
