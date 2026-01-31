import { useEffect } from "react";
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
import "leaflet/dist/leaflet.css";

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

// Custom icon for stations
const createStationIcon = (color: string) => {
  return L.divIcon({
    className: "custom-station-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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
        background-color: ${type === "weather_demand" ? "#3b82f6" : "#a855f7"};
        border: 2px solid white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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

export default function SimulationMap() {
  const dispatch = useAppDispatch();
  const { stations } = useAppSelector((state) => state.stations);
  const { selectedStationId, isPickingLocation, pickingForModal } =
    useAppSelector((state) => state.ui);
  const { simulationResult, pendingInterventions, activeInterventions } =
    useAppSelector((state) => state.scenarios);

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
  // Show active (from last simulation) if no pending, otherwise show pending
  const displayInterventions =
    pendingInterventions.length > 0
      ? pendingInterventions
      : activeInterventions;

  // Filter interventions that have location data
  const locationBasedInterventions = displayInterventions.filter(
    (i) => i.type === "event_demand" && i.params.lat && i.params.lon,
  );

  // Get utilization color for a station
  const getStationColor = (stationId: string) => {
    if (!simulationResult?.kpis?.stations) {
      return "#3b82f6"; // Default blue
    }

    const stationKpi = simulationResult.kpis.stations.find(
      (s) => s.station_id === stationId,
    );

    if (!stationKpi) return "#3b82f6";

    const utilization = stationKpi.charger_utilization;
    if (utilization > 0.9) return "#ef4444"; // Red - overutilized
    if (utilization > 0.7) return "#f59e0b"; // Orange - high
    if (utilization > 0.5) return "#22c55e"; // Green - good
    return "#3b82f6"; // Blue - low
  };

  // Default center (Delhi)
  const defaultCenter: [number, number] = [28.6139, 77.209];
  const defaultZoom = 11;

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className={`h-full w-full ${isPickingLocation ? "cursor-crosshair" : ""}`}
        style={{ background: "#0f172a" }}
      >
        {/* Dark tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Fit map to stations */}
        <FitBounds />

        {/* Location picker click handler - only active when picking */}
        {isPickingLocation && (
          <LocationPickerHandler onLocationPicked={handleLocationPicked} />
        )}

        {/* Station markers */}
        {stations.map((station) => {
          const isSelected = station.id === selectedStationId;
          const color = getStationColor(station.station_id);

          return (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={createStationIcon(isSelected ? "#fff" : color)}
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
                    <p className="text-xs text-gray-600">{station.name}</p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <span className="text-gray-500">Chargers:</span>{" "}
                      <span className="font-medium">{station.chargers}</span>
                    </div>
                    {/* <div>
                      <span className="text-gray-500">Bays:</span>{" "}
                      <span className="font-medium">{station.bays}</span>
                    </div> */}
                    <div>
                      <span className="text-gray-500">Capacity:</span>{" "}
                      <span className="font-medium">
                        {station.inventory_cap}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Event intervention markers with radius circles */}
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
              {/* Radius circle */}
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
              {/* Event marker */}
              <Marker
                position={[params.lat, params.lon]}
                icon={createEventIcon("event_demand")}
              >
                <Popup>
                  <div className="p-2 min-w-[160px]">
                    <h3 className="font-semibold text-sm text-purple-600">
                      🎉 {params.event_name || "Special Event"}
                    </h3>
                    <div className="mt-2 text-xs space-y-1">
                      <div>
                        <span className="text-gray-500">Radius:</span>{" "}
                        <span className="font-medium">
                          {params.radius_km || 5} km
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Demand:</span>{" "}
                        <span className="font-medium">
                          {params.multiplier || 1.5}x
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Time:</span>{" "}
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
        <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 text-xs">
          <div className="font-medium text-slate-300 mb-2">Utilization</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-400">{">"}90% (Overutilized)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-slate-400">70-90% (High)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-slate-400">50-70% (Optimal)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-400">{"<"}50% (Low)</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {stations.length === 0 && !isPickingLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 pointer-events-none">
          <div className="text-center">
            <p className="text-slate-400 text-lg">No stations configured</p>
            <p className="text-slate-500 text-sm mt-1">
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
            <div className="bg-slate-900/95 border border-blue-500/50 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3">
              <MapPin className="h-5 w-5 text-blue-400 animate-pulse" />
              <div className="text-center">
                <p className="text-white font-medium">
                  Click on the map to select location
                </p>
                <p className="text-slate-400 text-xs">
                  {pickingForModal === "addStation"
                    ? "Adding new station"
                    : "Editing station location"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelPicking}
                className="ml-2 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>

          {/* Crosshair in center (visual aid) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative w-12 h-12">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-400/50" />
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-400/50" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border-2 border-blue-400 rounded-full bg-blue-400/20" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
