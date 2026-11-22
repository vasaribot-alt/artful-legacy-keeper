import { supabase } from "@/integrations/supabase/client";
import { sortCvEntriesByYear } from "@/lib/cvOrder";

export interface CvEntry {
  section: string;
  year: string;
  entry_text: string;
  images: { storage_path: string; caption: string | null }[];
  source: "manual" | "exhibition";
}

export interface CvSection {
  section: string;
  entries: CvEntry[];
}

/**
 * Builds CV sections by merging manual cv_entries with auto-populated exhibitions.
 * Exhibition entries marked hide_from_cv = true are excluded.
 */
export async function buildCvSections(profileId: string, userId: string): Promise<CvSection[]> {
  // 1. Load manual CV entries
  const { data: entries } = await supabase
    .from("cv_entries")
    .select("*, cv_entry_images(*)")
    .eq("profile_id", profileId)
    .order("display_order", { ascending: true });

  // 2. Load visible exhibitions
  const { data: exhibitions } = await supabase
    .from("exhibitions")
    .select("*")
    .eq("user_id", userId)
    .eq("hide_from_cv", false)
    .order("opening_date", { ascending: false });

  const sectionMap = new Map<string, CvEntry[]>();

  // Add manual entries
  for (const e of entries || []) {
    const section = (e as any).section || "Other";
    if (!sectionMap.has(section)) sectionMap.set(section, []);
    sectionMap.get(section)!.push({
      section,
      year: (e as any).year || "",
      entry_text: (e as any).entry_text || "",
      images: ((e as any).cv_entry_images || []).map((img: any) => ({
        storage_path: img.storage_path,
        caption: img.caption,
      })),
      source: "manual",
    });
  }

  // Build exhibition entries grouped by type
  const soloExhibitions: CvEntry[] = [];
  const groupExhibitions: CvEntry[] = [];

  for (const ex of exhibitions || []) {
    const year = ex.opening_date
      ? new Date(ex.opening_date).getFullYear().toString()
      : "";
    
    const parts: string[] = [ex.title];
    if (ex.venue) parts.push(ex.venue);
    if (ex.city) parts.push(ex.city);
    if (ex.country) parts.push(ex.country);
    const entryText = parts.join(", ");

    const entry: CvEntry = {
      section: ex.exhibition_type === "solo" ? "Solo Exhibitions" : "Group Exhibitions",
      year,
      entry_text: entryText,
      images: [],
      source: "exhibition",
    };

    if (ex.exhibition_type === "solo") {
      soloExhibitions.push(entry);
    } else {
      groupExhibitions.push(entry);
    }
  }

  // Merge exhibition entries into sections
  // If these sections already exist from manual entries, append; otherwise create them
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const mergeInto = (kind: "solo" | "group", fallback: string, items: CvEntry[]) => {
    if (!items.length) return;
    // Reuse the artist's own section (e.g. "Selected Solo Exhibitions and Projects") instead of adding a second one
    const key = Array.from(sectionMap.keys()).find((k) => new RegExp(`\\b${kind}\\b`, "i").test(k)) ?? fallback;
    const existing = sectionMap.get(key) || [];
    const fresh = items.filter((ex) => {
      const title = norm(ex.entry_text.split(",")[0] || "");
      return !existing.some((m) => (!ex.year || !m.year || m.year.includes(ex.year)) && title && norm(m.entry_text).includes(title));
    });
    sectionMap.set(key, [...existing, ...fresh]);
  };
  mergeInto("solo", "Solo Exhibitions", soloExhibitions);
  mergeInto("group", "Group Exhibitions", groupExhibitions);

  return Array.from(sectionMap.entries()).map(([section, entries]) => ({
    section,
    entries: sortCvEntriesByYear(entries),
  }));
}
