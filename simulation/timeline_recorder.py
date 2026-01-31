"""Timeline recorder for capturing periodic snapshots during simulation."""

from typing import List, Dict, Any


class TimelineRecorder:
    """Records periodic snapshots of station states for frontend playback.
    
    Takes snapshots at configurable intervals during simulation,
    allowing the frontend to replay the simulation like a video scrubber.
    """
    
    def __init__(self, interval_min: float):
        """Initialize the timeline recorder.
        
        Args:
            interval_min: How often to take a snapshot, in simulation-minutes.
                         Recommended: 15 min for 24h sims, 60 min for weekly,
                         240 min for monthly.
        """
        self.interval_min = interval_min
        self.next_snapshot_time = 0.0  # First snapshot at time 0
        self.frames: List[Dict[str, Any]] = []
    
    def tick(self, current_time: float, stations: Dict[str, Any]) -> None:
        """Called every loop iteration to potentially record a snapshot.
        
        Only records when current_time crosses the next interval threshold.
        
        Args:
            current_time: Current simulation time in minutes.
            stations: Dictionary or list of station objects with state info.
                     Expected to have station_id and relevant metrics.
        """
        if current_time < self.next_snapshot_time:
            return
        
        # Record snapshot
        frame = self._capture_snapshot(current_time, stations)
        self.frames.append(frame)
        
        # Advance to next snapshot threshold
        self.next_snapshot_time += self.interval_min
    
    def _capture_snapshot(self, current_time: float, stations: Any) -> Dict[str, Any]:
        """Capture a single snapshot of all stations.
        
        Args:
            current_time: Current simulation time in minutes.
            stations: List of station objects or dict keyed by station_id.
        
        Returns:
            Dictionary containing timestamp and list of station snapshots.
        """
        station_snapshots = []
        
        # Handle both list and dict of stations
        if isinstance(stations, dict):
            station_list = stations.values()
        else:
            station_list = stations
        
        for station in station_list:
            snapshot = {
                "station_id": station.station_id,
                "timestamp_min": current_time,
                "queue_length": len(station.charged_store.get_queue),
                "batteries_available": station.charged_store.level,
                "chargers_in_use": station.charging_count,
                "swaps_completed": station.successful_swaps,
                "swaps_lost": station.rejected_swaps,
            }
            station_snapshots.append(snapshot)
        
        return {
            "timestamp_min": current_time,
            "stations": station_snapshots
        }
    
    def to_serializable(self) -> List[Dict[str, Any]]:
        """Convert all recorded frames to a plain list of dicts.
        
        Returns:
            List of frame dictionaries, ready for JSON serialization.
            Each frame contains:
                - timestamp_min: Time of the snapshot in minutes
                - stations: List of station snapshots with:
                    - station_id
                    - timestamp_min
                    - queue_length
                    - batteries_available
                    - chargers_in_use
                    - swaps_completed
                    - swaps_lost
        """
        # Already storing as plain dicts, so just return a copy
        return [frame.copy() for frame in self.frames]
    
    def get_frame_count(self) -> int:
        """Return the number of recorded frames."""
        return len(self.frames)
    
    def reset(self) -> None:
        """Reset the recorder for a new simulation run."""
        self.next_snapshot_time = 0.0
        self.frames = []
