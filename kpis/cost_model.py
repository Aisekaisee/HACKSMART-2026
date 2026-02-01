"""
Enhanced cost modeling for battery swap network operations.

Provides detailed cost breakdown including capital, operational, and opportunity costs.
Based on BatterySmart pricing structure.
"""

from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class BatterySmartPricing:
    """BatterySmart's actual pricing structure (all in ₹)."""

    # Swap pricing
    base_swap_price: float = 170.0      # ₹170 base price per swap
    # ₹70 for secondary swaps (if applicable)
    secondary_swap_price: float = 70.0
    service_charge_per_swap: float = 40.0  # ₹40 service charge per swap transaction

    # Leave/penalty structure
    leave_penalty: float = 120.0        # ₹120 penalty for battery leave
    leave_recovery_per_swap: float = 60.0  # ₹60 recovered per swap when leave
    free_leave_days_per_month: int = 4  # 4 free leave days per month

    @property
    def revenue_per_swap(self) -> float:
        """Total revenue per successful swap."""
        return self.base_swap_price + self.service_charge_per_swap  # ₹210


@dataclass
class CostParameters:
    """Cost parameters for network operations (all in ₹)."""

    # BatterySmart pricing
    pricing: BatterySmartPricing = field(default_factory=BatterySmartPricing)

    # Capital costs (one-time)
    cost_per_charger: float = 50000.0  # ₹50k per charger
    cost_per_battery: float = 15000.0  # ₹15k per battery (inventory)

    # Operational costs (per event/hour)
    # ₹20 per swap operation (staff time, consumables)
    cost_per_swap: float = 20.0
    cost_per_replenishment: float = 500.0  # ₹500 per replenishment event
    # ₹30 per battery charge (~2.5kWh @ ₹12/kWh)
    electricity_cost_per_charge: float = 30.0
    # ₹200/hr per station (2 staff @ ₹100/hr)
    labor_cost_per_hour: float = 200.0
    rent_per_station_daily: float = 1000.0  # ₹1000/day station rent

    # Operating costs (annual, prorated to 24hr)
    maintenance_cost_per_charger_daily: float = 50.0  # ₹50/day per charger


@dataclass
class CostBreakdown:
    """Detailed cost breakdown for simulation period."""

    # Capital costs
    charger_capital: float
    inventory_capital: float
    total_capital: float

    # Operational costs (24hr period)
    swap_operations_cost: float
    charging_cost: float
    labor_cost: float
    maintenance_cost: float
    replenishment_cost: float
    rent_cost: float = 0.0
    total_operational: float = 0.0

    # Revenue breakdown (BatterySmart pricing)
    base_swap_revenue: float = 0.0      # ₹170 × successful_swaps
    service_charge_revenue: float = 0.0  # ₹40 × successful_swaps
    total_revenue: float = 0.0

    # Opportunity costs
    lost_revenue: float = 0.0  # Revenue lost due to lost swaps

    # Per-swap metrics
    revenue_per_swap: float = 210.0  # ₹170 + ₹40
    cost_per_swap: float = 0.0       # Operational cost per swap
    margin_per_swap: float = 0.0     # Profit per swap

    # Net impact
    gross_profit: float = 0.0         # Revenue - operational costs
    # Same as gross_profit (for backward compatibility)
    net_operational_profit: float = 0.0
    profit_margin_pct: float = 0.0    # (profit / revenue) × 100
    total_cost: float = 0.0           # Capital + operational + opportunity

    # Swap counts for reference
    successful_swaps: int = 0
    lost_swaps: int = 0

    def get_operational_cost_dict(self) -> Dict[str, Any]:
        """Get operational cost in the format expected by frontend.

        Returns:
            Dict with "total" and "breakdown" keys.
        """
        return {
            "total": round(self.total_operational, 2),
            "breakdown": {
                "charger": round(self.charging_cost + self.maintenance_cost, 2),
                # Daily amortized
                "inventory": round(self.inventory_capital / 365, 2),
                "labor": round(self.labor_cost, 2),
                "opportunity": round(self.lost_revenue, 2)
            }
        }

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "capital": {
                "chargers": round(self.charger_capital, 2),
                "inventory": round(self.inventory_capital, 2),
                "total": round(self.total_capital, 2),
                # 1-year amortization
                "daily_amortized": round(self.total_capital / 365, 2)
            },
            "operational_24hr": {
                "total": round(self.total_operational, 2),
                "breakdown": {
                    "electricity": round(self.charging_cost, 2),
                    "labor": round(self.labor_cost, 2),
                    "maintenance": round(self.maintenance_cost, 2),
                    "rent": round(self.rent_cost, 2),
                    "swap_operations": round(self.swap_operations_cost, 2),
                    "replenishment": round(self.replenishment_cost, 2)
                }
            },
            "revenue": {
                "base_swap": round(self.base_swap_revenue, 2),
                "service_charge": round(self.service_charge_revenue, 2),
                "total": round(self.total_revenue, 2),
                "per_swap": round(self.revenue_per_swap, 2)
            },
            "opportunity": {
                "lost_revenue": round(self.lost_revenue, 2),
                "lost_swaps": self.lost_swaps
            },
            "per_swap_economics": {
                "revenue": round(self.revenue_per_swap, 2),
                "cost": round(self.cost_per_swap, 2),
                "margin": round(self.margin_per_swap, 2)
            },
            "summary": {
                "successful_swaps": self.successful_swaps,
                "lost_swaps": self.lost_swaps,
                "gross_profit": round(self.gross_profit, 2),
                "profit_margin_pct": round(self.profit_margin_pct, 2),
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
        total_inventory = sum(
            s.inventory_capacity for s in baseline_config.stations)

        charger_capital = total_chargers * self.params.cost_per_charger
        inventory_capital = total_inventory * self.params.cost_per_battery
        total_capital = charger_capital + inventory_capital

        # Calculate operational costs (24hr simulation period)
        total_successful_swaps = sum(
            s["stats"]["successful_swaps"] for s in stations)
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
        rent_cost = num_stations * self.params.rent_per_station_daily

        total_operational = (
            swap_operations_cost +
            charging_cost +
            labor_cost +
            maintenance_cost +
            replenishment_cost +
            rent_cost
        )

        # Calculate revenue using BatterySmart pricing
        pricing = self.params.pricing
        base_swap_revenue = total_successful_swaps * \
            pricing.base_swap_price  # ₹170 × swaps
        service_charge_revenue = total_successful_swaps * \
            pricing.service_charge_per_swap  # ₹40 × swaps
        total_revenue = base_swap_revenue + service_charge_revenue  # ₹210 × swaps

        # Calculate opportunity cost (lost revenue at full rate)
        lost_revenue = total_lost_swaps * pricing.revenue_per_swap

        # Per-swap economics
        revenue_per_swap = pricing.revenue_per_swap  # ₹210
        cost_per_swap = total_operational / \
            total_successful_swaps if total_successful_swaps > 0 else 0
        margin_per_swap = revenue_per_swap - cost_per_swap

        # Calculate net metrics
        gross_profit = total_revenue - total_operational
        profit_margin_pct = (gross_profit / total_revenue *
                             100) if total_revenue > 0 else 0
        total_cost = total_capital + total_operational + lost_revenue

        return CostBreakdown(
            charger_capital=charger_capital,
            inventory_capital=inventory_capital,
            total_capital=total_capital,
            swap_operations_cost=swap_operations_cost,
            charging_cost=charging_cost,
            labor_cost=labor_cost,
            maintenance_cost=maintenance_cost,
            replenishment_cost=replenishment_cost,
            rent_cost=rent_cost,
            total_operational=total_operational,
            base_swap_revenue=base_swap_revenue,
            service_charge_revenue=service_charge_revenue,
            total_revenue=total_revenue,
            lost_revenue=lost_revenue,
            revenue_per_swap=revenue_per_swap,
            cost_per_swap=cost_per_swap,
            margin_per_swap=margin_per_swap,
            gross_profit=gross_profit,
            net_operational_profit=gross_profit,  # Backward compatibility
            profit_margin_pct=profit_margin_pct,
            total_cost=total_cost,
            successful_swaps=total_successful_swaps,
            lost_swaps=total_lost_swaps
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
        print(f"  Battery Inventory:  ₹{costs.inventory_capital:>12,.0f}")
        print(f"  {'─'*40}")
        print(f"  Total Capital:      ₹{costs.total_capital:>12,.0f}")

        print("\nOPERATIONAL COSTS (24-hour period)")
        print(f"  Swap Operations:    ₹{costs.swap_operations_cost:>12,.0f}")
        print(f"  Electricity:        ₹{costs.charging_cost:>12,.0f}")
        print(f"  Labor:              ₹{costs.labor_cost:>12,.0f}")
        print(f"  Maintenance:        ₹{costs.maintenance_cost:>12,.0f}")
        print(f"  Rent:               ₹{costs.rent_cost:>12,.0f}")
        print(f"  Replenishment:      ₹{costs.replenishment_cost:>12,.0f}")
        print(f"  {'─'*40}")
        print(f"  Total Operational:  ₹{costs.total_operational:>12,.0f}")

        print("\nREVENUE (BatterySmart Pricing)")
        print(f"  Base Swap (₹170):   ₹{costs.base_swap_revenue:>12,.0f}")
        print(f"  Service (₹40):      ₹{costs.service_charge_revenue:>12,.0f}")
        print(f"  {'─'*40}")
        print(f"  Total Revenue:      ₹{costs.total_revenue:>12,.0f}")
        print(f"  Lost Revenue:       ₹{costs.lost_revenue:>12,.0f}")

        print("\nPER-SWAP ECONOMICS")
        print(f"  Revenue/Swap:       ₹{costs.revenue_per_swap:>12,.0f}")
        print(f"  Cost/Swap:          ₹{costs.cost_per_swap:>12,.0f}")
        print(f"  Margin/Swap:        ₹{costs.margin_per_swap:>12,.0f}")

        print("\nSUMMARY")
        print(f"  Successful Swaps:   {costs.successful_swaps:>12,}")
        print(f"  Lost Swaps:         {costs.lost_swaps:>12,}")
        print(f"  Net Profit (24hr):  ₹{costs.net_operational_profit:>12,.0f}")
        print(f"  Profit Margin:      {costs.profit_margin_pct:>11.1f}%")
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

        print(
            f"{'Capital Investment':<30} ₹{baseline_costs.total_capital:>13,.0f} ₹{scenario_costs.total_capital:>13,.0f} ₹{deltas['capital_delta']:>+13,.0f}")
        print(
            f"{'Operational (24hr)':<30} ₹{baseline_costs.total_operational:>13,.0f} ₹{scenario_costs.total_operational:>13,.0f} ₹{deltas['operational_delta']:>+13,.0f}")
        print(
            f"{'Revenue (24hr)':<30} ₹{baseline_costs.total_revenue:>13,.0f} ₹{scenario_costs.total_revenue:>13,.0f} ₹{deltas['revenue_delta']:>+13,.0f}")
        print(
            f"{'Lost Revenue':<30} ₹{baseline_costs.lost_revenue:>13,.0f} ₹{scenario_costs.lost_revenue:>13,.0f} ₹{deltas['lost_revenue_delta']:>+13,.0f}")
        print(
            f"{'Net Profit (24hr)':<30} ₹{baseline_costs.net_operational_profit:>13,.0f} ₹{scenario_costs.net_operational_profit:>13,.0f} ₹{deltas['profit_delta']:>+13,.0f}")

        # Calculate ROI if capital investment increased
        if deltas['capital_delta'] > 0 and deltas['profit_delta'] > 0:
            # Daily profit increase
            daily_profit_increase = deltas['profit_delta']
            # Approximate payback period in days
            payback_days = deltas['capital_delta'] / \
                daily_profit_increase if daily_profit_increase > 0 else float(
                    'inf')
            print(
                f"\n  → Additional Investment: ₹{deltas['capital_delta']:,.0f}")
            print(f"  → Daily Profit Increase: ₹{daily_profit_increase:,.0f}")
            print(
                f"  → Payback Period: ~{payback_days:.0f} days ({payback_days/30:.1f} months)")

        print(f"{'='*80}\n")
