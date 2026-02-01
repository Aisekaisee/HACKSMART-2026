import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setSelectedStation,
  setPickedLocation,
  cancelLocationPicking,
} from "@/features/uiSlice";
import { Button } from "@/components/ui/button";
import { X, MapPin } from "lucide-react";
import TimelinePlayback from "./TimelinePlayback";
import "leaflet/dist/leaflet.css";

// Inject CSS keyframe animations for markers
const injectAnimationStyles = () => {
  const styleId = "station-marker-animations";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes pulse-slow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.85; }
    }
    @keyframes pulse-medium {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }
    @keyframes pulse-fast {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.25); opacity: 0.75; }
    }
    @keyframes pulse-critical {
      0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 10px currentColor; }
      50% { transform: scale(1.3); opacity: 0.7; box-shadow: 0 0 20px currentColor; }
    }
    @keyframes ripple {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(3); opacity: 0; }
    }
    @keyframes glow {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3); }
    }
    @keyframes queue-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .station-marker-animated {
      transition: all 0.3s ease-out;
    }
    .station-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
    .station-pulse-medium { animation: pulse-medium 2s ease-in-out infinite; }
    .station-pulse-fast { animation: pulse-fast 1.5s ease-in-out infinite; }
    .station-pulse-critical { animation: pulse-critical 1s ease-in-out infinite; }
    .station-glow { animation: glow 2s ease-in-out infinite; }
    .station-queue-bounce { animation: queue-bounce 0.8s ease-in-out infinite; }
    .ripple-effect {
      position: absolute;
      border-radius: 50%;
      animation: ripple 1s ease-out forwards;
      pointer-events: none;
    }
    .custom-station-marker {
      background: transparent !important;
      border: none !important;
    }
  `;
  document.head.appendChild(style);
};

// Call once on module load
injectAnimationStyles();

// Fix for default marker icons in Leaflet with Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-expect-error - Leaflet internal
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom icon for stations - Animated Minimalistic Circle
interface StationAnimationData {
  utilization: number;
  queueLength: number;
  hasActivity: boolean;
  chargedInventory: number;
  inventoryCap: number;
}

const createStationIcon = (
  color: string,
  isSelected: boolean,
  animationData?: StationAnimationData,
) => {
  const baseSize = isSelected ? 18 : 12;
  const innerSize = isSelected ? 8 : 0;

  // Determine animation class based on utilization
  let pulseClass = "station-pulse-slow";
  let glowIntensity = 0.3;

  if (animationData) {
    const { utilization, queueLength, hasActivity } = animationData;

    if (utilization > 0.9) {
      pulseClass = "station-pulse-critical";
      glowIntensity = 0.6;
    } else if (utilization > 0.7) {
      pulseClass = "station-pulse-fast";
      glowIntensity = 0.5;
    } else if (utilization > 0.5) {
      pulseClass = "station-pulse-medium";
      glowIntensity = 0.4;
    }

    // Add bounce if there's a queue
    if (queueLength > 0) {
      pulseClass += " station-queue-bounce";
    }

    // Add glow if there's activity
    if (hasActivity) {
      pulseClass += " station-glow";
    }
  }

  // Size scales with queue length
  const queueBonus = animationData?.queueLength
    ? Math.min(animationData.queueLength * 1.5, 8)
    : 0;
  const size = baseSize + queueBonus;

  // Inventory indicator ring (shows battery level)
  let inventoryRing = "";
  if (animationData && animationData.inventoryCap > 0) {
    const inventoryPct =
      animationData.chargedInventory / animationData.inventoryCap;
    const ringColor =
      inventoryPct > 0.5
        ? "#10b981"
        : inventoryPct > 0.2
          ? "#f59e0b"
          : "#ef4444";
    const ringOpacity = 0.6;
    inventoryRing = `
      <div style="
        position: absolute;
        width: ${size + 8}px;
        height: ${size + 8}px;
        border: 2px solid ${ringColor};
        border-radius: 50%;
        opacity: ${ringOpacity};
        top: -4px;
        left: -4px;
        background: conic-gradient(${ringColor} ${inventoryPct * 360}deg, transparent ${inventoryPct * 360}deg);
        mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2px));
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2px));
      "></div>
    `;
  }

  // Ripple effect container for swap activity
  const rippleEffect = animationData?.hasActivity
    ? `<div class="ripple-effect" style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        top: 0;
        left: 0;
      "></div>`
    : "";

  return L.divIcon({
    className: "custom-station-marker",
    html: `
      <div class="station-marker-animated" style="position: relative; display: flex; justify-content: center; align-items: center; width: ${size}px; height: ${size}px;">
        ${inventoryRing}
        ${rippleEffect}
        <div class="${pulseClass}" style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 ${10 + glowIntensity * 20}px ${color}${Math.round(
            glowIntensity * 255,
          )
            .toString(16)
            .padStart(2, "0")};
          display: flex;
          justify-content: center;
          align-items: center;
          color: ${color};
        ">
          ${isSelected ? `<div style="width: ${innerSize}px; height: ${innerSize}px; background-color: white; border-radius: 50%;"></div>` : ""}
        </div>
        ${isSelected ? `<div style="position: absolute; width: ${size * 2.5}px; height: ${size * 2.5}px; background: ${color}; opacity: 0.15; border-radius: 50%; filter: blur(8px); z-index: -1;"></div>` : ""}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Custom icon for events
const createEventIcon = (type: string) => {
  const emoji = type === "weather_demand" ? "🌧️" : "🎉";
  return L.divIcon({
    className: "custom-event-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: ${type === "weather_demand" ? "hsl(var(--map-blue, 217 91% 60%))" : "hsl(var(--map-purple, 270 95% 65%))"};
        border: 2px solid white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">${emoji}</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Component to fit map bounds to stations
function FitBounds() {
  const map = useMap();
  const { stations } = useAppSelector((state) => state.stations);

  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map((s) => [s.latitude, s.longitude]),
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [stations, map]);

  return null;
}

// Component to handle location picking clicks
function LocationPickerHandler({
  onLocationPicked,
}: {
  onLocationPicked: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationPicked(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Station animation data based on timeline
interface StationAnimationData {
  utilization: number;
  queueLength: number;
  hasActivity: boolean;
  chargedInventory: number;
  inventoryCap: number;
}

export default function SimulationMap() {
  const dispatch = useAppDispatch();
  const { stations } = useAppSelector((state) => state.stations);
  const { selectedStationId, isPickingLocation, pickingForModal } =
    useAppSelector((state) => state.ui);
  const {
    simulationResult,
    pendingInterventions,
    activeInterventions,
    playbackIndex,
  } = useAppSelector((state) => state.scenarios);

  // Get current timeline frame based on playback index
  const timeline = simulationResult?.timeline || [];
  const currentFrame = timeline[playbackIndex] || null;
  const prevFrame = playbackIndex > 0 ? timeline[playbackIndex - 1] : null;

  // Memoize station animation data from current timeline frame
  const stationAnimationMap = useMemo(() => {
    const map: Record<string, StationAnimationData> = {};

    if (!currentFrame || !currentFrame.stations) return map;

    // Backend sends stations as array
    for (const stationData of currentFrame.stations) {
      const stationId = stationData.station_id;

      // Find station to get inventory capacity
      const station = stations.find((s) => s.station_id === stationId);
      const inventoryCap = station?.inventory_cap || 50;

      // Find KPI for utilization
      const stationKpi = simulationResult?.kpis?.stations?.find(
        (s) => s.station_id === stationId,
      );

      // Calculate activity by comparing with previous frame
      let hasActivity = false;
      if (prevFrame && prevFrame.stations) {
        const prevStationData = prevFrame.stations.find(
          (s) => s.station_id === stationId,
        );
        if (prevStationData) {
          hasActivity =
            stationData.swaps_completed > prevStationData.swaps_completed ||
            stationData.queue_length !== prevStationData.queue_length;
        }
      }

      map[stationId] = {
        utilization: stationKpi?.charger_utilization || 0,
        queueLength: stationData.queue_length || 0,
        hasActivity,
        chargedInventory: stationData.batteries_available || 0,
        inventoryCap,
      };
    }

    return map;
  }, [currentFrame, prevFrame, stations, simulationResult?.kpis?.stations]);

  // Handle location picked on map
  const handleLocationPicked = (lat: number, lng: number) => {
    if (isPickingLocation) {
      dispatch(
        setPickedLocation({
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
        }),
      );
    }
  };

  // Handle cancel picking
  const handleCancelPicking = () => {
    dispatch(cancelLocationPicking());
  };

  // Combine pending and active interventions for display
  const displayInterventions =
    pendingInterventions.length > 0
      ? pendingInterventions
      : activeInterventions;

  // Filter interventions that have location data
  const locationBasedInterventions = displayInterventions.filter(
    (i) => i.type === "event_demand" && i.params.lat && i.params.lon,
  );

  // Get picking mode label
  const getPickingModeLabel = () => {
    switch (pickingForModal) {
      case "addStation":
        return "new station";
      case "editStation":
        return "station";
      case "eventLocation":
        return "event";
      default:
        return "location";
    }
  };

  // Get utilization color for a station (uses live timeline data when available)
  const getStationColor = (stationId: string) => {
    // First check live timeline data for dynamic coloring
    const animData = stationAnimationMap[stationId];
    if (animData) {
      const utilization = animData.utilization;
      if (utilization > 0.9) return "#ef4444"; // Red - overutilized
      if (utilization > 0.7) return "#f59e0b"; // Orange - high
      if (utilization > 0.5) return "#10b981"; // Green - good
      return "#3b82f6"; // Blue - low
    }

    // Fallback to KPI data
    if (!simulationResult?.kpis?.stations) {
      return "#10b981"; // Default Emerald Green
    }

    const stationKpi = simulationResult.kpis.stations.find(
      (s) => s.station_id === stationId,
    );

    if (!stationKpi) return "#10b981";

    const utilization = stationKpi.charger_utilization;
    if (utilization > 0.9) return "#ef4444";
    if (utilization > 0.7) return "#f59e0b";
    if (utilization > 0.5) return "#10b981";
    return "#3b82f6";
  };

  // Default center (Delhi)
  const defaultCenter: [number, number] = [28.6139, 77.209];
  const defaultZoom = 11;

  return (
    <div className="absolute inset-0 bg-background">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className={`h-full w-full ${isPickingLocation ? "cursor-crosshair" : ""}`}
        style={{ background: "#000000" }} // Pure black background for map container
      >
        {/* Dark tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Fit map to stations */}
        <FitBounds />

        {/* Location picker click handler */}
        {isPickingLocation && (
          <LocationPickerHandler onLocationPicked={handleLocationPicked} />
        )}

        {/* Station markers */}
        {stations.map((station) => {
          const isSelected = station.id === selectedStationId;
          const color = getStationColor(station.station_id);
          const animationData = stationAnimationMap[station.station_id];

          return (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={createStationIcon(color, isSelected, animationData)}
              eventHandlers={{
                click: () => dispatch(setSelectedStation(station.id)),
              }}
            >
              <Popup className="station-popup">
                <div className="p-2 min-w-[180px]">
                  <h3 className="font-semibold text-sm">
                    {station.station_id}
                  </h3>
                  {station.name && (
                    <p className="text-xs text-muted-foreground">
                      {station.name}
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Chargers:</span>{" "}
                      <span className="font-medium">{station.chargers}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Capacity:</span>{" "}
                      <span className="font-medium">
                        {station.inventory_cap}
                      </span>
                    </div>
                    {animationData && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Queue:</span>{" "}
                          <span className="font-medium text-amber-500">
                            {animationData.queueLength}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Batteries:
                          </span>{" "}
                          <span className="font-medium text-emerald-500">
                            {animationData.chargedInventory}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Event intervention markers */}
        {locationBasedInterventions.map((intervention, index) => {
          const params = intervention.params as {
            event_name?: string;
            lat: number;
            lon: number;
            radius_km?: number;
            multiplier?: number;
            start_hour?: number;
            end_hour?: number;
          };
          const radiusMeters = (params.radius_km || 5) * 1000;

          return (
            <div key={`event-${index}`}>
              <Circle
                center={[params.lat, params.lon]}
                radius={radiusMeters}
                pathOptions={{
                  color: "#a855f7",
                  fillColor: "#a855f7",
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "5, 5",
                }}
              />
              <Marker
                position={[params.lat, params.lon]}
                icon={createEventIcon("event_demand")}
              >
                <Popup>
                  <div className="p-2 min-w-[160px]">
                    <h3 className="font-semibold text-sm text-purple-500">
                      🎉 {params.event_name || "Special Event"}
                    </h3>
                    <div className="mt-2 text-xs space-y-1">
                      <div>
                        <span className="text-muted-foreground">Radius:</span>{" "}
                        <span className="font-medium">
                          {params.radius_km || 5} km
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Demand:</span>{" "}
                        <span className="font-medium">
                          {params.multiplier || 1.5}x
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>{" "}
                        <span className="font-medium">
                          {params.start_hour || 0}h - {params.end_hour || 24}h
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      {simulationResult && (
        <div className="absolute bottom-4 left-4 bg-card/90 border border-border rounded-lg p-3 text-xs backdrop-blur-sm shadow-lg">
          <div className="font-medium text-foreground mb-2">Utilization</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">
                {">"}90% (Overutilized)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">70-90% (High)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">50-70% (Optimal)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">{"<"}50% (Low)</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {stations.length === 0 && !isPickingLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 pointer-events-none">
          <div className="text-center p-6 bg-card border border-border rounded-xl shadow-2xl">
            <p className="text-foreground text-lg font-medium">
              No stations configured
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Add stations from the left panel
            </p>
          </div>
        </div>
      )}

      {/* Location picking mode overlay */}
      {isPickingLocation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top instruction banner */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="bg-card/95 border border-primary/50 rounded-lg px-4 py-3 shadow-[0_0_15px_rgba(34,197,94,0.2)] flex items-center gap-3 backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-primary animate-pulse" />
              <div className="text-center">
                <p className="text-foreground font-medium">
                  Click on the map to select location
                </p>
                <p className="text-muted-foreground text-xs">
                  Placing {getPickingModeLabel()} location
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelPicking}
                className="ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>

          {/* Crosshair in center (visual aid) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative w-12 h-12">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/70" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/70" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border-2 border-primary rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Timeline Playback Controls */}
      <TimelinePlayback />
    </div>
  );
}
