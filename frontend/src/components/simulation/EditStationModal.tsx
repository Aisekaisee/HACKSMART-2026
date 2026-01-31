import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { updateStation } from "@/features/stationsSlice";
import { startLocationPicking, clearPickedLocation } from "@/features/uiSlice";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin } from "lucide-react";
import type { StationUpdate, StationTier } from "@/types";

interface EditStationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditStationModal({
  open,
  onOpenChange,
}: EditStationModalProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();
  const { stations } = useAppSelector((state) => state.stations);
  const { pickedLocation, pickingForModal } = useAppSelector(
    (state) => state.ui,
  );
  const [loading, setLoading] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [formData, setFormData] = useState<StationUpdate>({});

  // Filter out baseline stations (not editable)
  const editableStations = stations.filter(
    (s) => !s.id.startsWith("baseline-") && !s.isBaseline,
  );

  // When a station is selected, populate the form
  useEffect(() => {
    const station = stations.find((s) => s.id === selectedStationId);
    if (station) {
      setFormData({
        station_id: station.station_id,
        name: station.name || "",
        latitude: station.latitude,
        longitude: station.longitude,
        chargers: station.chargers,
        inventory_cap: station.inventory_cap,
        tier: station.tier || "medium",
      });
    }
  }, [selectedStationId, stations]);

  // When a location is picked from the map for this modal, update the form
  useEffect(() => {
    if (pickedLocation && pickingForModal === "editStation") {
      setFormData((prev) => ({
        ...prev,
        latitude: pickedLocation.lat,
        longitude: pickedLocation.lng,
      }));
      dispatch(clearPickedLocation());
    }
  }, [pickedLocation, pickingForModal, dispatch]);

  const handlePickOnMap = () => {
    dispatch(startLocationPicking("editStation"));
    onOpenChange(false); // Close modal temporarily
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedStationId) return;

    // Guard against baseline stations
    if (selectedStationId.startsWith("baseline-")) {
      toast.error("Cannot edit baseline stations. They are read-only.");
      return;
    }

    setLoading(true);
    try {
      const station = await api.stations.update(
        projectId,
        selectedStationId,
        formData,
      );
      dispatch(updateStation(station));
      toast.success("Station updated successfully");
      onOpenChange(false);
      setSelectedStationId("");
      setFormData({});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update station",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof StationUpdate,
    value: string | number | StationTier,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Station</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Select Station</Label>
            <Select
              value={selectedStationId}
              onValueChange={setSelectedStationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a station..." />
              </SelectTrigger>
              <SelectContent>
                {editableStations.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No editable stations available.
                    <br />
                    <span className="text-xs">Add a new station first.</span>
                  </div>
                ) : (
                  editableStations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.station_id} - {station.name || "Unnamed"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedStationId && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Station ID</Label>
                  <Input
                    value={formData.station_id || ""}
                    onChange={(e) => handleChange("station_id", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>
              </div>

              {/* Location Selection */}
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Latitude
                    </Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.latitude || 0}
                      onChange={(e) =>
                        handleChange(
                          "latitude",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Longitude
                    </Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.longitude || 0}
                      onChange={(e) =>
                        handleChange(
                          "longitude",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePickOnMap}
                      className="w-full h-9"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter coordinates manually or click the map pin to pick on the
                  map
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chargers</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.chargers || 5}
                    onChange={(e) =>
                      handleChange("chargers", parseInt(e.target.value) || 5)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inventory Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.inventory_cap || 100}
                    onChange={(e) =>
                      handleChange(
                        "inventory_cap",
                        parseInt(e.target.value) || 100,
                      )
                    }
                  />
                </div>
              </div>

              {/* Tier Selection */}
              <div className="space-y-2">
                <Label>Station Tier</Label>
                <Select
                  value={formData.tier || "medium"}
                  onValueChange={(value) =>
                    handleChange("tier", value as StationTier)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      🔴 High Tier - High demand (30+ swaps/hr)
                    </SelectItem>
                    <SelectItem value="medium">
                      🟡 Medium Tier - Medium demand (20 swaps/hr)
                    </SelectItem>
                    <SelectItem value="low">
                      🟢 Low Tier - Low demand (10 swaps/hr)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tier determines base demand rate for the station
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedStationId}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Station"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
