import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown, MapPin, Save, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  artworkId: string;
}

interface Facility {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
}

const TEXT_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "location_room", label: "Room", placeholder: "e.g. Living room, Vault B" },
  { key: "location_cabinet", label: "Cabinet", placeholder: "e.g. Cabinet 3" },
  { key: "location_shelf", label: "Shelf", placeholder: "e.g. Shelf 2" },
  { key: "location_box", label: "Box / crate", placeholder: "e.g. Crate 17" },
];

export const StructuredLocationSection = ({ artworkId }: Props) => {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const loadFacilities = async () => {
    const { data } = await supabase
      .from("collector_facilities" as any)
      .select("id, name, address, notes")
      .order("name", { ascending: true });
    setFacilities((data as any) || []);
  };

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
    loadFacilities();
  }, [artworkId]);

  const set = (k: string, v: string) => setVals((prev) => ({ ...prev, [k]: v }));

  const upsertFacilityIfNew = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = facilities.some(
      (f) => f.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return;
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    await supabase
      .from("collector_facilities" as any)
      .insert({ owner_id: uid, name: trimmed } as any);
    loadFacilities();
  };

  const deleteFacility = async (id: string) => {
    await supabase.from("collector_facilities" as any).delete().eq("id", id);
    loadFacilities();
  };

  const save = async () => {
    setSaving(true);
    const payload: any = {};
    [
      "location_facility",
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
    if (!error) {
      await upsertFacilityIfNew(vals.location_facility || "");
    }
    setSaving(false);
    if (error) toast.error("Failed to save location");
    else toast.success("Location saved");
  };

  const summary = [vals.location_facility, ...TEXT_FIELDS.map((f) => vals[f.key])]
    .filter(Boolean)
    .join(" › ");

  const currentFacility = vals.location_facility || "";

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

        {/* Facility picker */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Facility</Label>
            <button
              type="button"
              onClick={() => setManageOpen((v) => !v)}
              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {manageOpen ? "Done" : "Manage facilities"}
            </button>
          </div>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-between font-normal"
              >
                <span className={currentFacility ? "" : "text-muted-foreground"}>
                  {currentFacility || "Select or type a facility…"}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
              <Command>
                <CommandInput
                  placeholder="Search or type new facility…"
                  value={currentFacility}
                  onValueChange={(v) => set("location_facility", v)}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="text-xs text-muted-foreground py-2 px-3">
                      Press Save to add "{currentFacility}" as a new facility.
                    </div>
                  </CommandEmpty>
                  {facilities.length > 0 && (
                    <CommandGroup heading="Saved facilities">
                      {facilities.map((f) => (
                        <CommandItem
                          key={f.id}
                          value={f.name}
                          onSelect={() => {
                            set("location_facility", f.name);
                            setPickerOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate">{f.name}</span>
                          {currentFacility.toLowerCase() === f.name.toLowerCase() && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-[11px] text-muted-foreground mt-1">
            Pick from your saved facilities, or type a new one — it will be saved when you press Save.
          </p>
        </div>

        {manageOpen && (
          <div className="border border-border rounded-sm p-3 bg-secondary/30 space-y-2">
            <div className="text-xs font-medium">Your facilities</div>
            {facilities.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No facilities saved yet. Type one above and press Save.
              </p>
            ) : (
              <div className="space-y-1">
                {facilities.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteFacility(f.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      title="Delete facility"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Deleting a facility here removes it from the pick list, but doesn't change existing artwork locations.
            </p>
          </div>
        )}

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
