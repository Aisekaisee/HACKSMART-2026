import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "@/store";
import { addStation } from "@/features/stationsSlice";
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
import { Loader2 } from "lucide-react";
import type { StationCreate } from "@/types";

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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StationCreate>({
    station_id: "",
    name: "",
    latitude: 28.6,
    longitude: 77.2,
    chargers: 5,
    bays: 50,
    inventory_cap: 100,
  });

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
        bays: 50,
        inventory_cap: 100,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add station",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof StationCreate, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Station</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Station ID *</Label>
              <Input
                value={formData.station_id}
                onChange={(e) => handleChange("station_id", e.target.value)}
                placeholder="STATION_01"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Station Name"
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
                value={formData.latitude}
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
                value={formData.longitude}
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
                value={formData.chargers}
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
                value={formData.bays}
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
                value={formData.inventory_cap}
                onChange={(e) =>
                  handleChange("inventory_cap", parseInt(e.target.value) || 100)
                }
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

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
              disabled={loading}
            >
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
