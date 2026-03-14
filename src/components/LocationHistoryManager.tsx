import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface LocationEntry {
  id: string;
  location: string;
  moved_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  artworkId: string;
  currentLocation: string;
  onLocationChange: (location: string) => void;
}

export const LocationHistoryManager = ({ artworkId, currentLocation, onLocationChange }: Props) => {
  const [history, setHistory] = useState<LocationEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [artworkId]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("artwork_location_history" as any)
      .select("*")
      .eq("artwork_id", artworkId)
      .order("moved_date", { ascending: false, nullsFirst: false });
    if (data) setHistory(data as any);
  };

  const addEntry = async () => {
    if (!newLocation.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("artwork_location_history" as any).insert({
      artwork_id: artworkId,
      location: newLocation.trim(),
      moved_date: newDate || null,
      notes: newNotes.trim() || null,
    } as any);
    if (error) {
      toast.error("Failed to add location entry");
    } else {
      // Update the artwork's current location to the new one
      onLocationChange(newLocation.trim());
      setNewLocation("");
      setNewDate("");
      setNewNotes("");
      setShowAdd(false);
      fetchHistory();
    }
    setLoading(false);
  };

  const removeEntry = async (id: string) => {
    await supabase.from("artwork_location_history" as any).delete().eq("id", id);
    fetchHistory();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-base font-medium flex items-center gap-1.5">
          <MapPin className="w-4 h-4" /> Location History
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Move
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Track where this artwork has been — studio, storage, gallery loans, exhibitions.
      </p>

      {showAdd && (
        <div className="p-3 border border-border rounded-sm bg-secondary/30 space-y-3 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Location *</Label>
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Gallery X, Storage Unit A"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Date moved</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. On loan for exhibition, Consignment for sale"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={addEntry} disabled={loading || !newLocation.trim()}>
              {loading ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      )}

      {history.length > 0 ? (
        <div className="space-y-1.5">
          {history.map((entry, i) => (
            <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-sm border border-border bg-secondary/30 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{entry.location}</span>
                  {i === 0 && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-medium">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {entry.moved_date && <span>{new Date(entry.moved_date).toLocaleDateString()}</span>}
                  {entry.notes && <><span>·</span><span>{entry.notes}</span></>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No location history recorded yet.</p>
      )}
    </div>
  );
};
