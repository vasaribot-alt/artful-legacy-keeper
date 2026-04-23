import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";

interface CvEntry {
  id: string;
  entry_text: string;
  year: string | null;
  section: string;
}

interface ExhibitionPickerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** When provided, loads exhibitions for this user (e.g., registrar acting on behalf of client) */
  ownerId?: string;
}

const EXHIBITION_SECTIONS = ["exhibitions", "solo exhibitions", "group exhibitions", "selected exhibitions", "exhibition"];

export const ExhibitionPicker = ({ selectedIds, onSelectionChange, ownerId }: ExhibitionPickerProps) => {
  const [entries, setEntries] = useState<CvEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExhibitionEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const fetchExhibitionEntries = async () => {
    setLoading(true);
    let targetUserId = ownerId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      targetUserId = user.id;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", targetUserId)
      .single();

    if (!profile) { setLoading(false); return; }

    const { data } = await supabase
      .from("cv_entries")
      .select("id, entry_text, year, section")
      .eq("profile_id", profile.id)
      .order("year", { ascending: false });

    if (data) {
      // Filter to exhibition-related sections (case-insensitive)
      const filtered = data.filter((e) =>
        EXHIBITION_SECTIONS.some((s) => e.section.toLowerCase().includes(s)) ||
        e.section.toLowerCase().includes("exhibit")
      );
      setEntries(filtered);
    }
    setLoading(false);
  };

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectedEntries = entries.filter((e) => selectedIds.includes(e.id));

  return (
    <div>
      <Label className="mb-1.5 block">Exhibition History</Label>

      {/* Selected badges */}
      {selectedEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedEntries.map((entry) => (
            <Badge key={entry.id} variant="secondary" className="gap-1 pr-1 font-normal text-xs">
              <span className="truncate max-w-[200px]">
                {entry.year && `${entry.year} — `}{entry.entry_text}
              </span>
              <button
                type="button"
                onClick={() => toggle(entry.id)}
                className="ml-0.5 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            className="w-full justify-between font-normal text-sm"
          >
            {loading ? "Loading..." : `Select from CV exhibitions (${selectedIds.length} selected)`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="start">
          <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
            {entries.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">
                No exhibition entries found in your CV. Add exhibitions to your CV first.
              </p>
            )}
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => toggle(entry.id)}
                className="flex items-start gap-2 w-full text-left text-sm px-2 py-2 rounded-sm hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={selectedIds.includes(entry.id)}
                  className="mt-0.5 shrink-0"
                  tabIndex={-1}
                />
                <div className="min-w-0">
                  {entry.year && (
                    <span className="text-muted-foreground text-xs mr-1.5">{entry.year}</span>
                  )}
                  <span className="text-sm">{entry.entry_text}</span>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
