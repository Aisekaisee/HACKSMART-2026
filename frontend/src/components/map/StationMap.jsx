import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// --- Assets ---
// Create colored icons dynamically with optional pulse animation
const createStationIcon = (utilization, isSelected, isActive = false) => {
    // Green (<0.5), Yellow (<0.8), Red (>0.8)
    let color = '#10b981'; // Emerald 500
    if (utilization > 0.8) color = '#ef4444'; // Red 500
    else if (utilization > 0.5) color = '#f59e0b'; // Amber 500
    
    // Size changes slightly if selected
    const size = isSelected ? 18 : 14;
    
    // Add pulse animation class if station is active (during playback)
    const pulseStyle = isActive ? `
        animation: stationPulse 1.5s ease-in-out infinite;
    ` : '';
    
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 2px solid #0a0a0a;
            box-shadow: 0 0 ${isActive ? '20px' : '10px'} ${color}${isActive ? '' : '80'};
            transition: all 0.3s ease;
            ${pulseStyle}
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
};

const LocationPicker = ({ onPick, isActive }) => {
    useMapEvents({
        click(e) {
            if (isActive) {
                onPick(e.latlng);
            }
        },
    });
    
    // Change cursor
    const map = useMap();
    React.useEffect(() => {
        if (isActive) {
            map.getContainer().style.cursor = 'crosshair';
        } else {
            map.getContainer().style.cursor = 'grab';
        }
    }, [isActive, map]);

    return null;
};

// Dynamic bounds component
const MapBounds = ({ stations }) => {
    const map = useMap();
    useMemo(() => {
        if (stations && stations.length > 0) {
            const lats = stations.map(s => s.lat);
            const lons = stations.map(s => s.lon);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLon = Math.min(...lons);
            const maxLon = Math.max(...lons);
            map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
        }
    }, [stations, map]);
    return null;
};

const StationMap = ({ 
    stations, 
    onStationSelect, 
    selectedStationId, 
    isPickingLocation, 
    onLocationPicked,
    kpiData // Pass KPI data to color markers
}) => {
  const defaultCenter = [28.6139, 77.2090]; // New Delhi

  // Helper to get KPIs for a station
  const getStationUtil = (id) => {
      if (!kpiData || !kpiData.stations) return 0;
      const s = kpiData.stations.find(k => k.station_id === id);
      return s ? s.charger_utilization : 0;
  };

  // Generate simple connections (MST or Delaunay is overkill, just connect to nearest N or hub-spoke
  // For visual "network topology", let's just draw lines between closest neighbors or a central hub?
  // Let's assume a mesh for "Network" look: Connect each station to 2 nearest neighbors
  const connections = useMemo(() => {
      if (!stations || stations.length < 2) return [];
      const lines = [];
      // Naive approach: connect everyone to everyone? Too messy.
      // Top 2 nearest.
      stations.forEach((s1, i) => {
          // Find distances
          const dists = stations.map((s2, j) => {
              if (i === j) return { idx: j, dist: Infinity };
              const d = Math.sqrt(Math.pow(s1.lat - s2.lat, 2) + Math.pow(s1.lon - s2.lon, 2));
              return { idx: j, dist: d };
          });
          // Sort
          dists.sort((a, b) => a.dist - b.dist);
          // Take top 2
          dists.slice(0, 2).forEach(d => {
              const s2 = stations[d.idx];
              // Avoid duplicates (only add if i < j)
              if (i < d.idx) {
                  lines.push([[s1.lat, s1.lon], [s2.lat, s2.lon]]);
              }
          });
      });
      return lines;
  }, [stations]);

  return (
    <MapContainer center={defaultCenter} zoom={11} style={{ height: '100%', width: '100%', background: '#0a0a0a' }}>
      <TileLayer
        attribution='&copy; '
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
      />
      
      {/* Topology Lines */}
      {connections.map((pos, i) => (
          <Polyline 
            key={i} 
            positions={pos} 
            pathOptions={{
                color: '#10b981', 
                weight: 1, 
                opacity: 0.4, 
                dashArray: '10, 20', 
                className: 'animate-flow' 
            }} 
          />
      ))}
      
      {stations.map(station => {
        const util = getStationUtil(station.station_id);
        const isCritical = util > 0.8;
        
        return (
        <React.Fragment key={station.station_id}>
            {/* Interactive Radius Circle (Coverage) */}
            <Circle 
                center={[station.lat, station.lon]} 
                radius={2000} // 2km coverage
                pathOptions={{ 
                    color: selectedStationId === station.station_id ? '#10b981' : (isCritical ? '#ef4444' : '#262626'), 
                    fillColor: selectedStationId === station.station_id ? '#10b981' : (isCritical ? '#ef4444' : '#262626'), 
                    fillOpacity: isCritical ? 0.2 : 0.1, 
                    weight: 1,
                    className: isCritical ? 'pulse-red' : ''
                }} 
            />
            
            <Marker 
                position={[station.lat, station.lon]}
                icon={createStationIcon(getStationUtil(station.station_id), selectedStationId === station.station_id)}
                eventHandlers={{
                    click: () => onStationSelect(station.station_id),
                }}
            >
            <Popup className="custom-popup">
                <div className="font-bold text-sm tracking-wide">{station.station_id}</div>
                <div className="text-[10px] uppercase text-text-muted mt-1">{station.tier} Tier</div>
                <div className="mt-2 text-xs flex justify-between">
                    <span>Chargers:</span>
                    <span className="font-mono">{station.chargers}</span>
                </div>
            </Popup>
            </Marker>
        </React.Fragment>
      )
        })}
      
      <LocationPicker isActive={isPickingLocation} onPick={onLocationPicked} />
      <MapBounds stations={stations} />
    </MapContainer>
  )
  
}

export default StationMap;
