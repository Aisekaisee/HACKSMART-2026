"""Baseline validator to check simulation results against reference KPIs."""

import yaml
from pathlib import Path
from typing import Dict, Any, Tuple


class BaselineValidator:
    """Validate baseline simulation against reference KPIs."""
    
    # Error band tolerances
    WAIT_TIME_TOLERANCE = 0.15  # ±15%
    UTILIZATION_TOLERANCE = 0.10  # ±10%
    LOST_SWAPS_TOLERANCE = 0.15  # ±15%
    
    @staticmethod
    def load_reference_kpis(reference_path: Path) -> Dict[str, Any]:
        """Load reference KPIs from file."""
        with open(reference_path, 'r') as f:
            return yaml.safe_load(f)
    
    @staticmethod
    def validate(
        computed_kpis: Dict[str, Any],
        reference_kpis: Dict[str, Any]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Validate computed KPIs against reference.
        
        Returns:
            (pass/fail, detailed_report)
        """
        report = {
            "passed": True,
            "metrics": {}
        }
        
        city_kpis = computed_kpis.get("city_kpis", {})
        ref_city = reference_kpis.get("city_kpis", {})
        
        # Validate wait time
        wait_time_pass, wait_time_report = BaselineValidator._validate_metric(
            "avg_wait_time",
            city_kpis.get("avg_wait_time", 0.0),
            ref_city.get("avg_wait_time", 0.0),
            BaselineValidator.WAIT_TIME_TOLERANCE
        )
        report["metrics"]["avg_wait_time"] = wait_time_report
        report["passed"] = report["passed"] and wait_time_pass
        
        # Validate lost swaps
        lost_swaps_pass, lost_swaps_report = BaselineValidator._validate_metric(
            "lost_swaps_pct",
            city_kpis.get("lost_swaps_pct", 0.0),
            ref_city.get("lost_swaps_pct", 0.0),
            BaselineValidator.LOST_SWAPS_TOLERANCE
        )
        report["metrics"]["lost_swaps_pct"] = lost_swaps_report
        report["passed"] = report["passed"] and lost_swaps_pass
        
        # Validate charger utilization
        util_pass, util_report = BaselineValidator._validate_metric(
            "charger_utilization",
            city_kpis.get("charger_utilization", 0.0),
            ref_city.get("charger_utilization", 0.0),
            BaselineValidator.UTILIZATION_TOLERANCE
        )
        report["metrics"]["charger_utilization"] = util_report
        report["passed"] = report["passed"] and util_pass
        
        return report["passed"], report
    
    @staticmethod
    def _validate_metric(
        name: str,
        computed: float,
        reference: float,
        tolerance: float
    ) -> Tuple[bool, Dict[str, Any]]:
        """Validate a single metric within tolerance."""
        if reference == 0:
            # Special case: if reference is zero, check if computed is also near zero
            variance_pct = abs(computed)
            passed = computed < 0.01  # Absolute tolerance for near-zero values
        else:
            variance_pct = abs(computed - reference) / reference
            passed = variance_pct <= tolerance
        
        return passed, {
            "name": name,
            "computed": round(computed, 3),
            "reference": round(reference, 3),
            "variance_pct": round(variance_pct * 100, 2),
            "tolerance_pct": round(tolerance * 100, 1),
            "passed": passed
        }
    
    @staticmethod
    def print_report(report: Dict[str, Any]):
        """Pretty print validation report."""
        print("\n" + "="*60)
        print("BASELINE VALIDATION REPORT")
        print("="*60)
        
        for metric_name, metric_data in report["metrics"].items():
            status = "✓ PASS" if metric_data["passed"] else "✗ FAIL"
            print(f"\n{metric_name.upper()}: {status}")
            print(f"  Computed:   {metric_data['computed']}")
            print(f"  Reference:  {metric_data['reference']}")
            print(f"  Variance:   {metric_data['variance_pct']}%")
            print(f"  Tolerance:  ±{metric_data['tolerance_pct']}%")
        
        print("\n" + "="*60)
        overall = "✓ OVERALL PASS" if report["passed"] else "✗ OVERALL FAIL"
        print(f"{overall}")
        print("="*60 + "\n")
