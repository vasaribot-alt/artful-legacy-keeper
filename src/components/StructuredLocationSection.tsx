import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown, MapPin, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  artworkId: string;
}

const TEXT_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "location_facility", label: "Facility", placeholder: "e.g. Main residence, Storage Amsterdam" },
  { key: "location_room", label: "Room", placeholder: "e.g. Living room, Vault B" },
  { key: "location_cabinet", label: "Cabinet", placeholder: "e.g. Cabinet 3" },
  { key: "location_shelf", label: "Shelf", placeholder: "e.g. Shelf 2" },
  { key: "location_box", label: "Box / crate", placeholder: "e.g. Crate 17" },
];

export const StructuredLocationSection = ({ artworkId }: Props) => {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("artworks")
        .select(
          "location_facility, location_room, location_cabinet, location_shelf, location_box, env_temperature_note, env_humidity_note, env_light_note, hazard_notes"
        )
        .eq("id", artworkId)
        .maybeSingle();
      if (!data) return;
      const next: Record<string, string> = {};
      Object.entries(data as any).forEach(([k, v]) => {
        next[k] = v == null ? "" : String(v);
      });
      setVals(next);
    })();
  }, [artworkId]);

  const set = (k: string, v: string) => setVals((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload: any = {};
    [
      ...TEXT_FIELDS.map((f) => f.key),
      "env_temperature_note",
      "env_humidity_note",
      "env_light_note",
      "hazard_notes",
    ].forEach((k) => {
      const raw = (vals[k] || "").trim();
      payload[k] = raw === "" ? null : raw;
    });
    const { error } = await supabase.from("artworks").update(payload).eq("id", artworkId);
    setSaving(false);
    if (error) toast.error("Failed to save location");
    else toast.success("Location saved");
  };

  const summary = TEXT_FIELDS.map((f) => vals[f.key]).filter(Boolean).join(" › ");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex-1 flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <Label className="text-base font-medium cursor-pointer">Structured location</Label>
              {summary && (
                <span className="text-xs text-muted-foreground truncate">— {summary}</span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        {open && (
          <Button type="button" size="sm" onClick={save} disabled={saving} className="gap-1.5 shrink-0">
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save location"}
          </Button>
        )}
      </div>
      <CollapsibleContent className="pt-3 space-y-4">
        <p className="text-xs text-muted-foreground">
          Map where this work lives — from facility down to the exact box or shelf.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {TEXT_FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={vals[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1"
              />
            </div>
          ))}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Environmental conditions</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Temperature</Label>
              <Input
                value={vals.env_temperature_note ?? ""}
                onChange={(e) => set("env_temperature_note", e.target.value)}
                placeholder="e.g. 18–22 °C"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Humidity</Label>
              <Input
                value={vals.env_humidity_note ?? ""}
                onChange={(e) => set("env_humidity_note", e.target.value)}
                placeholder="e.g. 45–55 %"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Light</Label>
              <Input
                value={vals.env_light_note ?? ""}
                onChange={(e) => set("env_light_note", e.target.value)}
                placeholder="e.g. Max 50 lux"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Hazards & handling notes</Label>
          <Textarea
            value={vals.hazard_notes ?? ""}
            onChange={(e) => set("hazard_notes", e.target.value)}
            placeholder="e.g. Fragile — do not tilt. Contains lead paint. Handle with gloves."
            rows={2}
            className="mt-1"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
