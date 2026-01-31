import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { updateStation } from "@/features/stationsSlice";
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
import { Loader2 } from "lucide-react";
import type { StationUpdate } from "@/types";

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
  const [loading, setLoading] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [formData, setFormData] = useState<StationUpdate>({});

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
        bays: station.bays,
        inventory_cap: station.inventory_cap,
      });
    }
  }, [selectedStationId, stations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedStationId) return;

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

  const handleChange = (field: keyof StationUpdate, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Station</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Select Station</Label>
            <Select
              value={selectedStationId}
              onValueChange={setSelectedStationId}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                <SelectValue placeholder="Choose a station..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {stations.map((station) => (
                  <SelectItem
                    key={station.id}
                    value={station.id}
                    className="text-slate-300"
                  >
                    {station.station_id} - {station.name || "Unnamed"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStationId && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Station ID</Label>
                  <Input
                    value={formData.station_id || ""}
                    onChange={(e) => handleChange("station_id", e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Name</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Latitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.latitude || 0}
                    onChange={(e) =>
                      handleChange("latitude", parseFloat(e.target.value) || 0)
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Longitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.longitude || 0}
                    onChange={(e) =>
                      handleChange("longitude", parseFloat(e.target.value) || 0)
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Chargers</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.chargers || 5}
                    onChange={(e) =>
                      handleChange("chargers", parseInt(e.target.value) || 5)
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Bays</Label>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={formData.bays || 50}
                    onChange={(e) =>
                      handleChange("bays", parseInt(e.target.value) || 50)
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Inventory</Label>
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
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading || !selectedStationId}
            >
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
