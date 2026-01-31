"""Baseline validator to check simulation results against reference KPIs."""

import yaml
import math
from pathlib import Path
from typing import Dict, Any, Tuple, List


class BaselineValidator:
    """Validate baseline simulation against reference KPIs."""
    
    # Acceptance thresholds
    MAPE_MAX = 10.0  # Maximum acceptable MAPE (%)
    WAIT_TIME_TOLERANCE_PCT = 15.0  # ±15%
    LOST_SWAPS_TOLERANCE_PCT = 20.0  # ±20%
    UTILIZATION_TOLERANCE = 0.10  # ±10%
    
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
            (pass/fail, detailed_report with exact keys frontend expects)
        """
        city_kpis = computed_kpis.get("city_kpis", {})
        ref_city = reference_kpis.get("city_kpis", {})
        
        # Get station-level data
        computed_stations = computed_kpis.get("stations", [])
        ref_stations = reference_kpis.get("stations", [])
        
        # Build reference station lookup
        ref_station_map = {s.get("station_id"): s for s in ref_stations}
        
        # Calculate overall accuracy metrics
        predicted = []
        actual = []
        
        # Use multiple metrics for overall accuracy calculation
        metrics_to_compare = [
            ("avg_wait_time", city_kpis.get("avg_wait_time", 0), ref_city.get("avg_wait_time", 0)),
            ("lost_swaps_pct", city_kpis.get("lost_swaps_pct", 0), ref_city.get("lost_swaps_pct", 0)),
            ("charger_utilization", city_kpis.get("charger_utilization", 0), ref_city.get("charger_utilization", 0)),
            ("throughput", city_kpis.get("throughput", 0), ref_city.get("throughput", 0)),
        ]
        
        for name, pred, act in metrics_to_compare:
            if act is not None and act != 0:
                predicted.append(pred)
                actual.append(act)
        
        # Calculate R², MAPE, RMSE
        r_squared = BaselineValidator._calculate_r_squared(predicted, actual)
        mape = BaselineValidator._calculate_mape(predicted, actual)  # Already 0-100 scale
        rmse = BaselineValidator._calculate_rmse(predicted, actual)
        
        # Determine pass/fail based on MAPE threshold
        passed = mape < BaselineValidator.MAPE_MAX
        
        # Build per_station validation
        per_station = {}
        for station_data in computed_stations:
            station_id = station_data.get("station_id")
            ref_station = ref_station_map.get(station_id, {})
            
            station_metrics = BaselineValidator._validate_station(
                station_data, ref_station
            )
            per_station[station_id] = station_metrics
        
        # Thresholds for frontend display
        thresholds = {
            "mape_max": BaselineValidator.MAPE_MAX,
            "wait_time_tolerance_pct": BaselineValidator.WAIT_TIME_TOLERANCE_PCT,
            "lost_swaps_tolerance_pct": BaselineValidator.LOST_SWAPS_TOLERANCE_PCT
        }
        
        report = {
            "r_squared": round(r_squared, 4),
            "mape": round(mape, 2),  # 0-100 scale
            "rmse": round(rmse, 4),
            "passed": passed,
            "per_station": per_station,
            "thresholds": thresholds,
            # Legacy fields for backward compatibility
            "metrics": {}
        }
        
        # Add legacy metric validations
        for name, pred, act in metrics_to_compare:
            tolerance = BaselineValidator.WAIT_TIME_TOLERANCE_PCT / 100.0
            if "lost_swaps" in name:
                tolerance = BaselineValidator.LOST_SWAPS_TOLERANCE_PCT / 100.0
            elif "utilization" in name:
                tolerance = BaselineValidator.UTILIZATION_TOLERANCE
            
            metric_pass, metric_report = BaselineValidator._validate_metric(
                name, pred, act, tolerance
            )
            report["metrics"][name] = metric_report
        
        return passed, report
    
    @staticmethod
    def _calculate_r_squared(predicted: List[float], actual: List[float]) -> float:
        """Calculate R-squared (coefficient of determination)."""
        if len(predicted) < 2 or len(actual) < 2:
            return 0.0
        
        # Mean of actual values
        mean_actual = sum(actual) / len(actual)
        
        # Total sum of squares
        ss_total = sum((a - mean_actual) ** 2 for a in actual)
        if ss_total == 0:
            return 1.0 if all(p == a for p, a in zip(predicted, actual)) else 0.0
        
        # Residual sum of squares
        ss_residual = sum((a - p) ** 2 for p, a in zip(predicted, actual))
        
        r_squared = 1 - (ss_residual / ss_total)
        return max(0.0, r_squared)  # Clamp to [0, 1]
    
    @staticmethod
    def _calculate_mape(predicted: List[float], actual: List[float]) -> float:
        """Calculate Mean Absolute Percentage Error (0-100 scale)."""
        if not predicted or not actual:
            return 0.0
        
        total_error = 0.0
        count = 0
        
        for p, a in zip(predicted, actual):
            if a != 0:
                total_error += abs(p - a) / abs(a)
                count += 1
        
        if count == 0:
            return 0.0
        
        mape = (total_error / count) * 100.0  # Convert to percentage
        return mape
    
    @staticmethod
    def _calculate_rmse(predicted: List[float], actual: List[float]) -> float:
        """Calculate Root Mean Squared Error."""
        if not predicted or not actual:
            return 0.0
        
        mse = sum((p - a) ** 2 for p, a in zip(predicted, actual)) / len(predicted)
        return math.sqrt(mse)
    
    @staticmethod
    def _validate_station(
        computed: Dict[str, Any],
        reference: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate individual station metrics."""
        # Extract and compare key metrics
        comp_wait = computed.get("avg_wait_time", 0)
        ref_wait = reference.get("avg_wait_time", 0)
        
        comp_lost = computed.get("lost_swaps_pct", 0)
        ref_lost = reference.get("lost_swaps_pct", 0)
        
        comp_util = computed.get("charger_utilization", 0)
        ref_util = reference.get("charger_utilization", 0)
        
        # Calculate individual variances
        wait_variance = abs(comp_wait - ref_wait) / ref_wait * 100 if ref_wait else 0
        lost_variance = abs(comp_lost - ref_lost) / ref_lost * 100 if ref_lost else 0
        util_variance = abs(comp_util - ref_util) / ref_util * 100 if ref_util else 0
        
        # Station passes if all metrics are within tolerance
        wait_pass = wait_variance <= BaselineValidator.WAIT_TIME_TOLERANCE_PCT
        lost_pass = lost_variance <= BaselineValidator.LOST_SWAPS_TOLERANCE_PCT
        util_pass = util_variance <= (BaselineValidator.UTILIZATION_TOLERANCE * 100)
        
        return {
            "passed": wait_pass and lost_pass and util_pass,
            "avg_wait_time": {
                "computed": round(comp_wait, 2),
                "reference": round(ref_wait, 2),
                "variance_pct": round(wait_variance, 2),
                "passed": wait_pass
            },
            "lost_swaps_pct": {
                "computed": round(comp_lost, 2),
                "reference": round(ref_lost, 2),
                "variance_pct": round(lost_variance, 2),
                "passed": lost_pass
            },
            "charger_utilization": {
                "computed": round(comp_util, 4),
                "reference": round(ref_util, 4),
                "variance_pct": round(util_variance, 2),
                "passed": util_pass
            }
        }
    
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
        
        print(f"\nOverall Metrics:")
        print(f"  R²:     {report.get('r_squared', 'N/A')}")
        print(f"  MAPE:   {report.get('mape', 'N/A')}%")
        print(f"  RMSE:   {report.get('rmse', 'N/A')}")
        
        print(f"\nThresholds:")
        thresholds = report.get("thresholds", {})
        print(f"  Max MAPE:            {thresholds.get('mape_max', 10.0)}%")
        print(f"  Wait Time Tolerance: ±{thresholds.get('wait_time_tolerance_pct', 15.0)}%")
        print(f"  Lost Swaps Tolerance: ±{thresholds.get('lost_swaps_tolerance_pct', 20.0)}%")
        
        # Legacy metrics display
        if "metrics" in report:
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

