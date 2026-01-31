import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { InterventionItem, InterventionType } from "@/types";

interface InterventionFormProps {
  type: InterventionType;
  onSubmit: (intervention: InterventionItem) => void;
  onCancel: () => void;
}

export default function InterventionForm({
  type,
  onSubmit,
  onCancel,
}: InterventionFormProps) {
  // Weather intervention state
  const [weatherCondition, setWeatherCondition] = useState("rain");
  const [weatherMultiplier, setWeatherMultiplier] = useState(0.8);
  const [weatherStartHour, setWeatherStartHour] = useState(0);
  const [weatherEndHour, setWeatherEndHour] = useState(24);

  // Event intervention state
  const [eventName, setEventName] = useState("");
  const [eventLat, setEventLat] = useState(28.6);
  const [eventLon, setEventLon] = useState(77.2);
  const [eventRadius, setEventRadius] = useState(5);
  const [eventMultiplier, setEventMultiplier] = useState(1.5);
  const [eventStartHour, setEventStartHour] = useState(0);
  const [eventEndHour, setEventEndHour] = useState(24);

  // Replenishment intervention state
  const [replenishmentPolicy, setReplenishmentPolicy] = useState("reactive");

  const handleSubmit = () => {
    let intervention: InterventionItem;

    switch (type) {
      case "weather_demand":
        intervention = {
          type: "weather_demand",
          params: {
            condition: weatherCondition,
            multiplier: weatherMultiplier,
            start_hour: weatherStartHour,
            end_hour: weatherEndHour,
          },
        };
        break;
      case "event_demand":
        intervention = {
          type: "event_demand",
          params: {
            event_name: eventName || "Custom Event",
            lat: eventLat,
            lon: eventLon,
            radius_km: eventRadius,
            multiplier: eventMultiplier,
            start_hour: eventStartHour,
            end_hour: eventEndHour,
          },
        };
        break;
      case "replenishment_policy":
        intervention = {
          type: "replenishment_policy",
          params: {
            policy: replenishmentPolicy,
          },
        };
        break;
      default:
        return;
    }

    onSubmit(intervention);
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-4 space-y-4">
        {type === "weather_demand" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">
                Weather Condition
              </Label>
              <Select
                value={weatherCondition}
                onValueChange={setWeatherCondition}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-300 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="rain" className="text-slate-300">
                    Rain
                  </SelectItem>
                  <SelectItem value="heavy_rain" className="text-slate-300">
                    Heavy Rain
                  </SelectItem>
                  <SelectItem value="extreme_heat" className="text-slate-300">
                    Extreme Heat
                  </SelectItem>
                  <SelectItem value="fog" className="text-slate-300">
                    Fog
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">
                Demand Multiplier: {weatherMultiplier.toFixed(2)}x
              </Label>
              <Slider
                value={[weatherMultiplier]}
                onValueChange={(v) => setWeatherMultiplier(v[0])}
                min={0.2}
                max={2}
                step={0.1}
                className="py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Start Hour</Label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={weatherStartHour}
                  onChange={(e) =>
                    setWeatherStartHour(parseInt(e.target.value) || 0)
                  }
                  className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">End Hour</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={weatherEndHour}
                  onChange={(e) =>
                    setWeatherEndHour(parseInt(e.target.value) || 24)
                  }
                  className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                />
              </div>
            </div>
          </>
        )}

        {type === "event_demand" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Event Name</Label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Cricket Match, Festival"
                className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={eventLat}
                  onChange={(e) => setEventLat(parseFloat(e.target.value) || 0)}
                  className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={eventLon}
                  onChange={(e) => setEventLon(parseFloat(e.target.value) || 0)}
                  className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">
                Radius: {eventRadius} km
              </Label>
              <Slider
                value={[eventRadius]}
                onValueChange={(v) => setEventRadius(v[0])}
                min={1}
                max={20}
                step={1}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">
                Demand Multiplier: {eventMultiplier.toFixed(2)}x
              </Label>
              <Slider
                value={[eventMultiplier]}
                onValueChange={(v) => setEventMultiplier(v[0])}
                min={1}
                max={3}
                step={0.1}
                className="py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Start Hour</Label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={eventStartHour}
                  onChange={(e) =>
                    setEventStartHour(parseInt(e.target.value) || 0)
                  }
                  className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">End Hour</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={eventEndHour}
                  onChange={(e) =>
                    setEventEndHour(parseInt(e.target.value) || 24)
                  }
                  className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                />
              </div>
            </div>
          </>
        )}

        {type === "replenishment_policy" && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Policy Type</Label>
            <Select
              value={replenishmentPolicy}
              onValueChange={setReplenishmentPolicy}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-300 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="reactive" className="text-slate-300">
                  Reactive (on-demand)
                </SelectItem>
                <SelectItem value="proactive" className="text-slate-300">
                  Proactive (scheduled)
                </SelectItem>
                <SelectItem value="predictive" className="text-slate-300">
                  Predictive (ML-based)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-1 text-slate-400 h-8"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-8"
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
