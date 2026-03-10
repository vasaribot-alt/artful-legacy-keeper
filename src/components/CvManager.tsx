import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface CvEntry {
  id?: string;
  profile_id: string;
  section: string;
  entry_text: string;
  year: string;
  display_order: number;
  images?: CvEntryImage[];
}

interface CvEntryImage {
  id?: string;
  cv_entry_id: string;
  storage_path: string;
  caption: string;
  display_order: number;
}

interface CvSection {
  name: string;
  entries: CvEntry[];
  collapsed: boolean;
}

interface CvManagerProps {
  profileId: string;
}

const CvManager = ({ profileId }: CvManagerProps) => {
  const [sections, setSections] = useState<CvSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEntries();
  }, [profileId]);

  const loadEntries = async () => {
    const { data: entries, error } = await supabase
      .from("cv_entries")
      .select("*")
      .eq("profile_id", profileId)
      .order("display_order");

    if (error) {
      toast.error("Failed to load CV entries");
      setLoading(false);
      return;
    }

    // Load images for all entries
    const entryIds = (entries || []).map((e: any) => e.id);
    let images: any[] = [];
    if (entryIds.length > 0) {
      const { data: imgData } = await supabase
        .from("cv_entry_images")
        .select("*")
        .in("cv_entry_id", entryIds)
        .order("display_order");
      images = imgData || [];
    }

    // Group by section
    const sectionMap = new Map<string, CvEntry[]>();
    for (const entry of entries || []) {
      const e = entry as any;
      const sectionName = e.section || "Uncategorized";
      if (!sectionMap.has(sectionName)) sectionMap.set(sectionName, []);
      sectionMap.get(sectionName)!.push({
        id: e.id,
        profile_id: e.profile_id,
        section: e.section,
        entry_text: e.entry_text,
        year: e.year || "",
        display_order: e.display_order,
        images: images.filter((img: any) => img.cv_entry_id === e.id).map((img: any) => ({
          id: img.id,
          cv_entry_id: img.cv_entry_id,
          storage_path: img.storage_path,
          caption: img.caption || "",
          display_order: img.display_order,
        })),
      });
    }

    const sectionList: CvSection[] = Array.from(sectionMap.entries()).map(([name, entries]) => ({
      name,
      entries,
      collapsed: false,
    }));

    setSections(sectionList);
    setLoading(false);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20MB)");
      return;
    }

    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error } = await supabase.functions.invoke("parse-cv", {
        body: { pdfBase64: base64 },
      });

      if (error) throw error;

      const parsed = data as { sections: { section_name: string; entries: { year?: string; text: string }[] }[] };
      if (!parsed?.sections?.length) {
        toast.error("Could not parse CV content");
        setParsing(false);
        return;
      }

      let order = sections.reduce((max, s) => Math.max(max, ...s.entries.map(e => e.display_order)), -1) + 1;

      const newSections: CvSection[] = [...sections];
      for (const section of parsed.sections) {
        const existingIdx = newSections.findIndex(s => s.name === section.section_name);
        const newEntries: CvEntry[] = section.entries.map((entry) => ({
          profile_id: profileId,
          section: section.section_name,
          entry_text: entry.text,
          year: entry.year || "",
          display_order: order++,
          images: [],
        }));

        if (existingIdx >= 0) {
          newSections[existingIdx].entries.push(...newEntries);
        } else {
          newSections.push({ name: section.section_name, entries: newEntries, collapsed: false });
        }
      }

      setSections(newSections);
      toast.success("CV parsed successfully! Review and save.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse CV");
    }
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing entries (cascade deletes images)
      await supabase.from("cv_entries").delete().eq("profile_id", profileId);

      // Insert all entries
      for (const section of sections) {
        for (const entry of section.entries) {
          const { data: inserted, error } = await supabase
            .from("cv_entries")
            .insert({
              profile_id: profileId,
              section: section.name,
              entry_text: entry.entry_text,
              year: entry.year || null,
              display_order: entry.display_order,
            } as any)
            .select()
            .single();

          if (error) throw error;

          // Re-insert images
          if (entry.images?.length) {
            for (const img of entry.images) {
              await supabase.from("cv_entry_images").insert({
                cv_entry_id: (inserted as any).id,
                storage_path: img.storage_path,
                caption: img.caption || null,
                display_order: img.display_order,
              } as any);
            }
          }
        }
      }

      toast.success("CV saved");
      await loadEntries();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save CV");
    }
    setSaving(false);
  };

  const addSection = () => {
    setSections([...sections, { name: "New Section", entries: [], collapsed: false }]);
  };

  const removeSection = (si: number) => {
    setSections(sections.filter((_, i) => i !== si));
  };

  const updateSectionName = (si: number, name: string) => {
    const updated = [...sections];
    updated[si] = { ...updated[si], name };
    // Update section name in all entries too
    updated[si].entries = updated[si].entries.map(e => ({ ...e, section: name }));
    setSections(updated);
  };

  const toggleSection = (si: number) => {
    const updated = [...sections];
    updated[si] = { ...updated[si], collapsed: !updated[si].collapsed };
    setSections(updated);
  };

  const addEntry = (si: number) => {
    const updated = [...sections];
    const maxOrder = updated[si].entries.reduce((max, e) => Math.max(max, e.display_order), -1);
    updated[si].entries.push({
      profile_id: profileId,
      section: updated[si].name,
      entry_text: "",
      year: "",
      display_order: maxOrder + 1,
      images: [],
    });
    setSections(updated);
  };

  const removeEntry = (si: number, ei: number) => {
    const updated = [...sections];
    updated[si].entries = updated[si].entries.filter((_, i) => i !== ei);
    setSections(updated);
  };

  const updateEntry = (si: number, ei: number, field: "year" | "entry_text", value: string) => {
    const updated = [...sections];
    updated[si].entries[ei] = { ...updated[si].entries[ei], [field]: value };
    setSections(updated);
  };

  const handleImageUpload = async (si: number, ei: number, files: FileList) => {
    const updated = [...sections];
    const entry = updated[si].entries[ei];
    if (!entry.images) entry.images = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const path = `${profileId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("cv-images").upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      entry.images.push({
        cv_entry_id: entry.id || "",
        storage_path: path,
        caption: "",
        display_order: entry.images.length,
      });
    }
    setSections(updated);
    toast.success("Images uploaded");
  };

  const removeImage = async (si: number, ei: number, ii: number) => {
    const updated = [...sections];
    const img = updated[si].entries[ei].images?.[ii];
    if (!img) return;

    await supabase.storage.from("cv-images").remove([img.storage_path]);
    if (img.id) {
      await supabase.from("cv_entry_images").delete().eq("id", img.id);
    }
    updated[si].entries[ei].images = updated[si].entries[ei].images!.filter((_, i) => i !== ii);
    setSections(updated);
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from("cv-images").getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading CV…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Upload + Actions */}
      <div className="flex flex-wrap gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handlePdfUpload}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
          className="gap-2"
        >
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {parsing ? "Parsing PDF…" : "Upload CV (PDF)"}
        </Button>
        <Button variant="outline" onClick={addSection} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Section
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2 ml-auto">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save CV"}
        </Button>
      </div>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No CV entries yet. Upload a PDF or add sections manually.
        </p>
      )}

      {/* Sections */}
      {sections.map((section, si) => (
        <div key={si} className="border border-border rounded-sm">
          {/* Section Header */}
          <div className="flex items-center gap-2 p-3 bg-muted/30">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSection(si)}>
              {section.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Input
              value={section.name}
              onChange={(e) => updateSectionName(si, e.target.value)}
              className="font-medium h-8 bg-transparent border-none shadow-none focus-visible:ring-1"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {section.entries.length} {section.entries.length === 1 ? "entry" : "entries"}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeSection(si)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>

          {/* Entries */}
          {!section.collapsed && (
            <div className="p-3 space-y-3">
              {section.entries.map((entry, ei) => (
                <div key={ei} className="border border-border/50 rounded-sm p-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="w-24 shrink-0">
                      <Input
                        value={entry.year}
                        onChange={(e) => updateEntry(si, ei, "year", e.target.value)}
                        placeholder="Year"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={entry.entry_text}
                        onChange={(e) => updateEntry(si, ei, "entry_text", e.target.value)}
                        placeholder="Entry description"
                        className="h-8 text-sm"
                      />
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files && handleImageUpload(si, ei, e.target.files)}
                      />
                      <div className="h-8 w-8 flex items-center justify-center rounded-sm border border-border hover:bg-accent transition-colors">
                        <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </label>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEntry(si, ei)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>

                  {/* Entry Images */}
                  {entry.images && entry.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {entry.images.map((img, ii) => (
                        <div key={ii} className="relative group w-20 h-20">
                          <img
                            src={getImageUrl(img.storage_path)}
                            alt=""
                            className="w-full h-full object-cover rounded-sm border border-border"
                          />
                          <button
                            onClick={() => removeImage(si, ei, ii)}
                            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Button variant="ghost" size="sm" onClick={() => addEntry(si)} className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> Add Entry
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CvManager;
