import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useAppDispatch, useAppSelector } from "@/store";
import { setSelectedStation } from "@/features/uiSlice";
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

export default function SimulationMap() {
  const dispatch = useAppDispatch();
  const { stations } = useAppSelector((state) => state.stations);
  const { selectedStationId } = useAppSelector((state) => state.ui);
  const { simulationResult } = useAppSelector((state) => state.scenarios);

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
        className="h-full w-full"
        style={{ background: "#0f172a" }}
      >
        {/* Dark tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Fit map to stations */}
        <FitBounds />

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
                    <div>
                      <span className="text-gray-500">Bays:</span>{" "}
                      <span className="font-medium">{station.bays}</span>
                    </div>
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
      {stations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 pointer-events-none">
          <div className="text-center">
            <p className="text-slate-400 text-lg">No stations configured</p>
            <p className="text-slate-500 text-sm mt-1">
              Add stations from the left panel
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
