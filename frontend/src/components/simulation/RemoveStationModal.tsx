import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { removeStation } from "@/features/stationsSlice";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

interface RemoveStationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RemoveStationModal({
  open,
  onOpenChange,
}: RemoveStationModalProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();
  const { stations } = useAppSelector((state) => state.stations);
  const [loading, setLoading] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>("");

  // Filter out baseline stations (not deletable)
  const deletableStations = stations.filter(
    (s) => !s.id.startsWith("baseline-") && !s.isBaseline,
  );

  const selectedStation = stations.find((s) => s.id === selectedStationId);

  const handleRemove = async () => {
    if (!projectId || !selectedStationId) return;

    // Guard against baseline stations
    if (selectedStationId.startsWith("baseline-")) {
      toast.error("Cannot remove baseline stations. They are read-only.");
      return;
    }

    setLoading(true);
    try {
      await api.stations.delete(projectId, selectedStationId);
      dispatch(removeStation(selectedStationId));
      toast.success("Station removed successfully");
      onOpenChange(false);
      setSelectedStationId("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove station",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Remove Station
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            This action cannot be undone. The station will be permanently
            removed from this project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Select Station to Remove</Label>
            <Select
              value={selectedStationId}
              onValueChange={setSelectedStationId}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                <SelectValue placeholder="Choose a station..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {deletableStations.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-slate-500 text-center">
                    No removable stations.
                    <br />
                    <span className="text-xs">
                      Baseline stations are read-only.
                    </span>
                  </div>
                ) : (
                  deletableStations.map((station) => (
                    <SelectItem
                      key={station.id}
                      value={station.id}
                      className="text-slate-300"
                    >
                      {station.station_id} - {station.name || "Unnamed"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedStation && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-slate-300">
                You are about to remove{" "}
                <span className="font-semibold text-red-400">
                  {selectedStation.station_id}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Location: ({selectedStation.latitude.toFixed(4)},{" "}
                {selectedStation.longitude.toFixed(4)})
              </p>
            </div>
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
              onClick={handleRemove}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading || !selectedStationId}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Station"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
