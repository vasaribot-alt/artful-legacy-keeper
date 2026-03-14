import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParsedExhibition {
  title: string;
  exhibition_type: "solo" | "group";
  venue: string | null;
  city: string | null;
  country: string | null;
  curator: string | null;
  year: string | null;
  cv_entry_id: string;
  selected?: boolean;
  alreadyImported?: boolean;
}

interface ImportCvExhibitionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export const ImportCvExhibitionsDialog = ({
  open,
  onOpenChange,
  onImported,
}: ImportCvExhibitionsDialogProps) => {
  const [step, setStep] = useState<"idle" | "parsing" | "preview" | "importing">("idle");
  const [exhibitions, setExhibitions] = useState<ParsedExhibition[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "solo" | "group">("all");

  const handleParse = async () => {
    setStep("parsing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) throw new Error("No profile found");

      // Fetch exhibition-related CV entries
      const { data: entries } = await supabase
        .from("cv_entries")
        .select("id, section, year, entry_text")
        .eq("profile_id", profile.id)
        .order("year", { ascending: false });

      if (!entries?.length) {
        toast.info("No CV entries found to import");
        setStep("idle");
        return;
      }

      // Filter to exhibition sections
      const exhibitionEntries = entries.filter((e) =>
        e.section.toLowerCase().includes("exhibition") ||
        e.section.toLowerCase().includes("exhibit")
      );

      if (!exhibitionEntries.length) {
        toast.info("No exhibition entries found in your CV");
        setStep("idle");
        return;
      }

      // Call edge function to parse
      const { data, error } = await supabase.functions.invoke("parse-cv-exhibitions", {
        body: { entries: exhibitionEntries },
      });

      if (error) throw error;

      // Fetch existing exhibitions to detect duplicates
      const { data: existingExhibitions } = await supabase
        .from("exhibitions")
        .select("title, venue, opening_date, exhibition_type")
        .eq("user_id", user.id);

      const existingKeys = new Set(
        (existingExhibitions || []).map((ex) => {
          const year = ex.opening_date ? ex.opening_date.substring(0, 4) : "";
          return `${ex.title?.toLowerCase().trim()}|${ex.venue?.toLowerCase().trim() || ""}|${year}`;
        })
      );

      const parsed = (data.exhibitions || [])
        .filter((ex: ParsedExhibition) => ex.title)
        .map((ex: ParsedExhibition) => {
          const key = `${ex.title.toLowerCase().trim()}|${(ex.venue || "").toLowerCase().trim()}|${ex.year || ""}`;
          const alreadyExists = existingKeys.has(key);
          return {
            ...ex,
            selected: !alreadyExists,
            alreadyImported: alreadyExists,
          };
        });

      if (!parsed.length) {
        toast.info("Could not parse any exhibitions from CV entries");
        setStep("idle");
        return;
      }

      setExhibitions(parsed);
      setStep("preview");
    } catch (err: any) {
      console.error("Parse error:", err);
      toast.error("Failed to parse CV entries");
      setStep("idle");
    }
  };

  const toggleAll = (checked: boolean) => {
    setExhibitions((prev) => prev.map((e) => ({ ...e, selected: checked })));
  };

  const toggleOne = (index: number) => {
    setExhibitions((prev) =>
      prev.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e))
    );
  };

  const handleImport = async () => {
    const selected = exhibitions.filter((e) => e.selected);
    if (!selected.length) {
      toast.error("No exhibitions selected");
      return;
    }

    setStep("importing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const records = selected
        .filter((ex) => ex.title) // skip entries with null/empty titles
        .map((ex) => ({
          title: ex.title,
          exhibition_type: ex.exhibition_type,
          venue: ex.venue || null,
          city: ex.city || null,
          country: ex.country || null,
          curator: ex.curator || null,
          opening_date: ex.year ? `${ex.year}-01-01` : null,
          user_id: user.id,
        }));

      if (!records.length) {
        toast.error("No valid exhibitions to import");
        setStep("preview");
        return;
      }

      const { error } = await supabase.from("exhibitions").insert(records);
      if (error) throw error;

      toast.success(`Imported ${selected.length} exhibitions`);
      onOpenChange(false);
      setStep("idle");
      setExhibitions([]);
      onImported();
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error("Failed to import exhibitions");
      setStep("preview");
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep("idle");
      setExhibitions([]);
    }
    onOpenChange(open);
  };

  const filteredExhibitions = typeFilter === "all"
    ? exhibitions
    : exhibitions.filter((e) => e.exhibition_type === typeFilter);
  const selectedCount = exhibitions.filter((e) => e.selected).length;
  const soloCount = exhibitions.filter((e) => e.exhibition_type === "solo").length;
  const groupCount = exhibitions.filter((e) => e.exhibition_type === "group").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Exhibitions from CV</DialogTitle>
        </DialogHeader>

        {step === "idle" && (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Automatically parse your CV exhibition entries into individual exhibition records.
            </p>
            <Button onClick={handleParse} className="gap-2">
              <FileUp className="w-4 h-4" />
              Scan CV Entries
            </Button>
          </div>
        )}

        {step === "parsing" && (
          <div className="text-center py-12 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Parsing exhibition entries…</p>
          </div>
        )}

        {step === "preview" && (
          <>
            {/* Type filter tabs */}
            <div className="flex gap-1 px-1 pb-2">
              {(["all", "solo", "group"] as const).map((t) => {
                const count = t === "all" ? exhibitions.length : t === "solo" ? soloCount : groupCount;
                const isActive = typeFilter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "all" ? "All" : t === "solo" ? "Solo" : "Group"} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-1 pb-2 border-b">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={filteredExhibitions.every((e) => e.selected)}
                  onCheckedChange={(checked) => {
                    // Toggle only filtered exhibitions
                    const filteredIds = new Set(filteredExhibitions.map((_, i) =>
                      exhibitions.indexOf(filteredExhibitions[i])
                    ));
                    setExhibitions((prev) =>
                      prev.map((e, i) => filteredIds.has(i) ? { ...e, selected: !!checked } : e)
                    );
                  }}
                />
                Select all ({filteredExhibitions.length})
              </label>
              <span className="text-xs text-muted-foreground">
                {selectedCount} selected total
              </span>
            </div>

            <ScrollArea className="flex-1 min-h-0 h-[50vh]">
              <div className="space-y-1 py-2">
                {filteredExhibitions.map((ex) => {
                  const globalIndex = exhibitions.indexOf(ex);
                  return (
                    <button
                      key={globalIndex}
                      type="button"
                      onClick={() => toggleOne(globalIndex)}
                      className="flex items-start gap-3 w-full text-left px-2 py-2.5 rounded-sm hover:bg-accent transition-colors"
                    >
                      <Checkbox
                        checked={ex.selected}
                        className="mt-0.5 shrink-0"
                        tabIndex={-1}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{ex.title}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {ex.exhibition_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {[ex.venue, ex.city, ex.country].filter(Boolean).join(", ")}
                          {ex.year && ` · ${ex.year}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0}>
                Import {selectedCount} Exhibition{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="text-center py-12 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Importing exhibitions…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
