import { useEffect, useRef, useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setPlaybackIndex,
  setIsPlaying,
  setPlaybackSpeed,
  resetPlayback,
} from "@/features/scenariosSlice";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Clock,
  Activity,
  GripHorizontal,
} from "lucide-react";
import type { TimelineFrame } from "@/types";

// Parse frame to get aggregated stats
function getFrameStats(
  frame: TimelineFrame | null,
  prevFrame: TimelineFrame | null,
) {
  if (!frame || !frame.stations) {
    return { queue: 0, arrivals: 0, swaps: 0, lost: 0 };
  }

  const totals = frame.stations.reduce(
    (acc, station) => ({
      queue: acc.queue + (station.queue_length || 0),
      swaps: acc.swaps + (station.swaps_completed || 0),
      lost: acc.lost + (station.swaps_lost || 0),
    }),
    { queue: 0, swaps: 0, lost: 0 },
  );

  // Calculate arrivals as delta from previous frame (swaps + lost delta)
  let arrivals = 0;
  if (prevFrame && prevFrame.stations) {
    const prevTotals = prevFrame.stations.reduce(
      (acc, station) => ({
        swaps: acc.swaps + (station.swaps_completed || 0),
        lost: acc.lost + (station.swaps_lost || 0),
      }),
      { swaps: 0, lost: 0 },
    );
    arrivals = Math.max(
      0,
      totals.swaps - prevTotals.swaps + (totals.lost - prevTotals.lost),
    );
  }

  return { ...totals, arrivals };
}

export default function TimelinePlayback() {
  const dispatch = useAppDispatch();
  const { simulationResult, playbackIndex, isPlaying, playbackSpeed } =
    useAppSelector((state) => state.scenarios);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeline = simulationResult?.timeline || [];
  const maxIndex = Math.max(0, timeline.length - 1);

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Playback interval effect
  useEffect(() => {
    if (isPlaying && timeline.length > 0) {
      intervalRef.current = setInterval(() => {
        dispatch(
          setPlaybackIndex(playbackIndex >= maxIndex ? 0 : playbackIndex + 1),
        );
      }, 1000 / playbackSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    isPlaying,
    playbackIndex,
    maxIndex,
    playbackSpeed,
    dispatch,
    timeline.length,
  ]);

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, input, [role="slider"]'))
        return;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handlePlayPause = useCallback(() => {
    if (timeline.length === 0) return;
    dispatch(setIsPlaying(!isPlaying));
  }, [dispatch, isPlaying, timeline.length]);

  const handleReset = useCallback(() => {
    dispatch(resetPlayback());
  }, [dispatch]);

  const handleSpeedChange = useCallback(() => {
    const speeds = [0.5, 1, 2, 4];
    const currentIdx = speeds.indexOf(playbackSpeed);
    const nextIdx = (currentIdx + 1) % speeds.length;
    dispatch(setPlaybackSpeed(speeds[nextIdx]));
  }, [dispatch, playbackSpeed]);

  const handleSliderChange = useCallback(
    (value: number[]) => {
      dispatch(setPlaybackIndex(value[0]));
      if (isPlaying) {
        dispatch(setIsPlaying(false));
      }
    },
    [dispatch, isPlaying],
  );

  // Get current frame data
  const currentFrame = timeline[playbackIndex];
  const prevFrame = playbackIndex > 0 ? timeline[playbackIndex - 1] : null;
  const currentTimeMin = currentFrame?.timestamp_min ?? 0;

  // Convert minutes to day/hour format
  const formatTime = (minutes: number) => {
    const totalHours = Math.floor(minutes / 60);
    const day = Math.floor(totalHours / 24) + 1;
    const hourOfDay = totalHours % 24;
    const mins = Math.floor(minutes % 60);
    return { day, hourOfDay, mins, totalHours };
  };

  const { day, hourOfDay, mins } = formatTime(currentTimeMin);
  const startTime = timeline[0]?.timestamp_min ?? 0;
  const endTime = timeline[maxIndex]?.timestamp_min ?? 0;
  const { totalHours: startHours } = formatTime(startTime);
  const { totalHours: endHours } = formatTime(endTime);

  // Get stats for current frame
  const stats = getFrameStats(currentFrame, prevFrame);

  // Don't render if no simulation result
  if (!simulationResult || timeline.length === 0) {
    return null;
  }

  return (
    <div
      ref={dragRef}
      className="absolute bottom-4 left-1/2 z-[1000]"
      style={{
        transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      <div
        className={`bg-card/95 border border-border rounded-xl p-4 shadow-2xl backdrop-blur-sm min-w-[400px] max-w-[550px] ${isDragging ? "ring-2 ring-primary/50" : ""}`}
        onMouseDown={handleMouseDown}
      >
        {/* Drag Handle Header */}
        <div className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <GripHorizontal className="h-4 w-4 text-muted-foreground" />
            <Activity className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">
              Simulation Playback
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Day {day}, {hourOfDay.toString().padStart(2, "0")}:
              {mins.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="mb-4">
          <Slider
            value={[playbackIndex]}
            max={maxIndex}
            step={1}
            onValueChange={handleSliderChange}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Hour {startHours}</span>
            <span className="text-primary font-medium">
              Frame {playbackIndex + 1} / {timeline.length}
            </span>
            <span>Hour {endHours}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-9 px-3"
            title="Reset to start"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant={isPlaying ? "default" : "outline"}
            size="sm"
            onClick={handlePlayPause}
            className={`h-9 px-4 ${isPlaying ? "bg-primary hover:bg-primary/90" : ""}`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            {isPlaying ? "Pause" : "Play"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSpeedChange}
            className="h-9 px-3 min-w-[60px]"
            title="Change speed"
          >
            <FastForward className="h-4 w-4 mr-1" />
            {playbackSpeed}x
          </Button>
        </div>

        {/* Live Stats Preview */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-foreground">
                {stats.queue}
              </div>
              <div className="text-xs text-muted-foreground">In Queue</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">
                {stats.arrivals}
              </div>
              <div className="text-xs text-muted-foreground">Arrivals</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400">
                {stats.swaps}
              </div>
              <div className="text-xs text-muted-foreground">Total Swaps</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">{stats.lost}</div>
              <div className="text-xs text-muted-foreground">Total Lost</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
