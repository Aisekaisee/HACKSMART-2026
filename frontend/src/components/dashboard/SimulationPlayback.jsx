import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';

const SimulationPlayback = ({ hourlySnapshots, onHourChange, stations }) => {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const maxHour = hourlySnapshots?.length ? hourlySnapshots.length - 1 : 23;

  // Playback logic
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentHour(prev => {
        const next = prev >= maxHour ? 0 : prev + 1;
        return next;
      });
    }, 800); // 800ms per hour for smooth playback
    
    return () => clearInterval(timer);
  }, [isPlaying, maxHour]);

  // Notify parent when hour changes
  useEffect(() => {
    if (onHourChange && hourlySnapshots?.[currentHour]) {
      onHourChange(currentHour, hourlySnapshots[currentHour]);
    }
  }, [currentHour, hourlySnapshots, onHourChange]);

  const formatHour = (hour) => {
    const h = hour % 24;
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setCurrentHour(value);
    setIsPlaying(false);
  };

  // Get current snapshot stats
  const currentSnapshot = hourlySnapshots?.[currentHour];
  const totalArrivals = currentSnapshot?.stations?.reduce((sum, s) => sum + s.total_arrivals, 0) || 0;
  const totalSwaps = currentSnapshot?.stations?.reduce((sum, s) => sum + s.successful_swaps, 0) || 0;
  const totalLost = currentSnapshot?.stations?.reduce((sum, s) => sum + s.rejected_swaps, 0) || 0;

  if (!hourlySnapshots || hourlySnapshots.length === 0) {
    return null;
  }

  return (
    <div className="bg-panel border border-panel-border rounded-lg p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-primary" />
          <span className="text-xs font-bold text-text-main uppercase tracking-wider">
            Simulation Playback
          </span>
        </div>
        <div className="flex items-center gap-1 bg-bg-dark px-2 py-1 rounded">
          <span className="text-lg font-mono font-bold text-primary">{formatHour(currentHour)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentHour(0)}
          className="p-1.5 hover:bg-white/10 rounded transition-colors"
          title="Reset"
        >
          <SkipBack size={14} className="text-text-muted" />
        </button>
        
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2 rounded-full transition-all ${
            isPlaying 
              ? 'bg-primary text-bg-dark' 
              : 'bg-white/10 text-text-main hover:bg-primary hover:text-bg-dark'
          }`}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        
        <button
          onClick={() => setCurrentHour(Math.min(currentHour + 1, maxHour))}
          className="p-1.5 hover:bg-white/10 rounded transition-colors"
          title="Next Hour"
        >
          <SkipForward size={14} className="text-text-muted" />
        </button>

        {/* Slider */}
        <div className="flex-1 mx-2">
          <input
            type="range"
            min={0}
            max={maxHour}
            value={currentHour}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-panel-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        
        <span className="text-[10px] text-text-muted font-mono w-16 text-right">
          {currentHour + 1}/{maxHour + 1}hr
        </span>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-panel-border">
        <div className="text-center">
          <div className="text-xs font-mono font-bold text-text-main">{totalArrivals}</div>
          <div className="text-[9px] text-text-muted uppercase">Arrivals</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-mono font-bold text-primary">{totalSwaps}</div>
          <div className="text-[9px] text-text-muted uppercase">Swaps</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-mono font-bold text-danger">{totalLost}</div>
          <div className="text-[9px] text-text-muted uppercase">Lost</div>
        </div>
      </div>

      {/* Station Status (mini bar chart) */}
      {currentSnapshot?.stations && (
        <div className="flex gap-1 items-end h-8">
          {currentSnapshot.stations.map((station) => {
            const total = station.charged_inventory + station.depleted_inventory;
            const chargedPct = total > 0 ? (station.charged_inventory / total) * 100 : 0;
            return (
              <div 
                key={station.station_id}
                className="flex-1 bg-panel-border rounded-sm overflow-hidden relative group"
                style={{ height: '100%' }}
              >
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-primary transition-all duration-300"
                  style={{ height: `${chargedPct}%` }}
                />
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-dark border border-panel-border px-1.5 py-0.5 rounded text-[8px] opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  {station.station_id}: {station.charged_inventory} charged
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimulationPlayback;
