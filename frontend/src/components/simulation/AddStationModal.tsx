import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { addStation } from "@/features/stationsSlice";
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
import type { StationCreate, StationTier } from "@/types";

interface AddStationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddStationModal({
  open,
  onOpenChange,
}: AddStationModalProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();
  const { pickedLocation, pickingForModal } = useAppSelector(
    (state) => state.ui,
  );
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StationCreate>({
    station_id: "",
    name: "",
    latitude: 28.6,
    longitude: 77.2,
    chargers: 5,
    inventory_cap: 100,
    tier: "medium",
  });

  // When a location is picked from the map for this modal, update the form
  useEffect(() => {
    if (pickedLocation && pickingForModal === "addStation") {
      setFormData((prev) => ({
        ...prev,
        latitude: pickedLocation.lat,
        longitude: pickedLocation.lng,
      }));
      dispatch(clearPickedLocation());
    }
  }, [pickedLocation, pickingForModal, dispatch]);

  const handlePickOnMap = () => {
    dispatch(startLocationPicking("addStation"));
    onOpenChange(false); // Close modal temporarily
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    if (!formData.station_id.trim()) {
      toast.error("Station ID is required");
      return;
    }

    setLoading(true);
    try {
      const station = await api.stations.create(projectId, formData);
      dispatch(addStation(station));
      toast.success("Station added successfully");
      onOpenChange(false);
      // Reset form
      setFormData({
        station_id: "",
        name: "",
        latitude: 28.6,
        longitude: 77.2,
        chargers: 5,
        inventory_cap: 100,
        tier: "medium",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add station",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof StationCreate,
    value: string | number | StationTier,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Station</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Station ID *</Label>
              <Input
                value={formData.station_id}
                onChange={(e) => handleChange("station_id", e.target.value)}
                placeholder="STATION_01"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Station Name"
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
                  value={formData.latitude}
                  onChange={(e) =>
                    handleChange("latitude", parseFloat(e.target.value) || 0)
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
                  value={formData.longitude}
                  onChange={(e) =>
                    handleChange("longitude", parseFloat(e.target.value) || 0)
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
              Enter coordinates manually or click the map pin to pick on the map
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chargers</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={formData.chargers}
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
                value={formData.inventory_cap}
                onChange={(e) =>
                  handleChange("inventory_cap", parseInt(e.target.value) || 100)
                }
              />
            </div>
          </div>

          {/* Tier Selection */}
          <div className="space-y-2">
            <Label>Station Tier *</Label>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Station"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
