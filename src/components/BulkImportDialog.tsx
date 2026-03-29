import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Check, AlertCircle, ImagePlus, CheckCircle2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** When provided, artworks are inserted for this owner (registrar acting on behalf of client) */
  ownerId?: string;
  /** Role context for template generation */
  userRole?: "artist" | "collector" | "registrar";
}

interface SizeGroup {
  height: number | null;
  width: number | null;
  editionCount: number | null;
  artistProofs: number | null;
  price: number | null;
}

interface ParsedRow {
  title: string;
  artworkType: string;
  series: string;
  year: number | null;
  medium: string;
  support: string;
  height: number | null;
  width: number | null;
  depth: number | null;
  signed: string;
  location: string;
  provenance: string;
  exhibitionHistory: string;
  description: string;
  imageFilename: string;
  selected: boolean;
  /** Multi-size groups for photography/editions */
  sizes: SizeGroup[];
  price: number | null;
  currency: string;
}

interface ImportedArtwork {
  id: string;
  title: string;
  imageFilename: string;
  matched: boolean;
}

/** Map of lowercase header → ParsedRow field for single-value columns */
const COLUMN_MAP: Record<string, keyof Pick<ParsedRow, "title" | "artworkType" | "series" | "year" | "medium" | "support" | "height" | "width" | "depth" | "signed" | "location" | "provenance" | "exhibitionHistory" | "description" | "imageFilename" | "price">> = {
  "title": "title",
  "category": "artworkType",
  "type": "artworkType",
  "artwork type": "artworkType",
  "series": "series",
  "year": "year",
  "date": "year",
  "medium": "medium",
  "support": "support",
  "height": "height",
  "size hight cm": "height",
  "size height cm": "height",
  "høyde cm": "height",
  "width": "width",
  "size width cm": "width",
  "bredde cm": "width",
  "depth": "depth",
  "size depth cm": "depth",
  "signed": "signed",
  "location": "location",
  "provenance": "provenance",
  "exhibition history": "exhibitionHistory",
  "description": "description",
  "notes": "description",
  "merknader": "description",
  "image": "imageFilename",
  "image number / id": "imageFilename",
  "image number": "imageFilename",
  "image id": "imageFilename",
  "filename": "imageFilename",
  "price": "price",
  "pris": "price",
  "pris u/ramme": "price",
};

/** Headers that indicate a size-group column */
const SIZE_HEADERS: Record<string, "height" | "width" | "editionCount" | "artistProofs" | "price"> = {
  "høyde cm": "height",
  "height": "height",
  "bredde cm": "width",
  "width": "width",
  "opplag": "editionCount",
  "edition": "editionCount",
  "edition count": "editionCount",
  "ap": "artistProofs",
  "artist proofs": "artistProofs",
  "pris m/ramme": "price",
  "pris": "price",
  "price": "price",
};

/**
 * Detect repeated size-group columns (for photography multi-size layout).
 * Returns an array of size groups, each with column indices for height/width/edition/ap/price.
 * Only activated when the same dimension header appears more than once.
 */
function detectSizeGroups(headers: string[]): { groups: { height?: number; width?: number; editionCount?: number; artistProofs?: number; price?: number }[]; isSizeLayout: boolean } {
  const lower = headers.map(h => (h || "").toLowerCase().trim());

  // Count how many times dimension headers appear
  const heightIndices = lower.reduce<number[]>((acc, h, i) => {
    if (h === "høyde cm" || h === "height" || h === "size height cm" || h === "size hight cm") acc.push(i);
    return acc;
  }, []);

  if (heightIndices.length <= 1) return { groups: [], isSizeLayout: false };

  // We have multiple height columns — parse size groups
  const groups: { height?: number; width?: number; editionCount?: number; artistProofs?: number; price?: number }[] = [];

  for (const startIdx of heightIndices) {
    const group: { height?: number; width?: number; editionCount?: number; artistProofs?: number; price?: number } = { height: startIdx };

    // Scan forward from startIdx+1 for the next few columns to find width, edition, ap, price
    for (let j = startIdx + 1; j < Math.min(startIdx + 6, headers.length); j++) {
      const h = lower[j];
      if (h === "bredde cm" || h === "width" || h === "size width cm") group.width = j;
      else if (h === "opplag" || h === "edition" || h === "edition count") group.editionCount = j;
      else if (h === "ap" || h === "artist proofs") group.artistProofs = j;
      else if (h === "pris m/ramme" || h === "pris" || h === "price") group.price = j;
      // Stop if we hit another height column (next group)
      if (h === "høyde cm" || h === "height" || h === "size height cm" || h === "size hight cm") break;
    }

    groups.push(group);
  }

  return { groups, isSizeLayout: true };
}

function parseNumber(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/** Normalize filename for matching: strip path, lowercase, remove extension */
function normalizeFilename(name: string): string {
  return name.replace(/^.*[\\/]/, "").toLowerCase().replace(/\.[^.]+$/, "").trim();
}

type Step = "upload" | "preview" | "importing" | "images" | "uploading";

const ARTIST_UNIQUE_HEADERS = [
  "Title", "Category", "Series", "Year", "Medium", "Support",
  "Height", "Width", "Depth", "Signed", "Location",
  "Exhibition History", "Description", "Image ID", "Price", "Currency"
];

const ARTIST_EDITIONS_HEADERS = [
  "Title", "Category", "Series", "Year", "Medium", "Support",
  "Signed", "Description", "Image ID",
  "Høyde cm", "Bredde cm", "Opplag", "AP", "Pris m/ramme",
  "Høyde cm", "Bredde cm", "Opplag", "AP", "Pris m/ramme",
  "Høyde cm", "Bredde cm", "Opplag", "AP", "Pris m/ramme"
];

const COLLECTOR_UNIQUE_HEADERS = [
  "Title", "Artist Name", "Category", "Year", "Medium", "Support",
  "Height", "Width", "Depth", "Location", "Provenance",
  "Description", "Image ID", "Price", "Currency"
];

const COLLECTOR_EDITIONS_HEADERS = [
  "Title", "Artist Name", "Category", "Year", "Medium", "Support",
  "Location", "Provenance", "Description", "Image ID",
  "Høyde cm", "Bredde cm", "Opplag", "AP", "Pris m/ramme",
  "Høyde cm", "Bredde cm", "Opplag", "AP", "Pris m/ramme"
];

function downloadTemplate(headers: string[], filename: string) {
  import("xlsx-js-style").then((XLSXStyle) => {
    const wb = XLSXStyle.utils.book_new();
    const wsData = [headers];
    const ws = XLSXStyle.utils.aoa_to_sheet(wsData);

    // Bold header row
    headers.forEach((_, i) => {
      const ref = XLSXStyle.utils.encode_cell({ r: 0, c: i });
      if (ws[ref]) ws[ref].s = { font: { bold: true } };
    });

    ws["!cols"] = headers.map(() => ({ wch: 16 }));
    XLSXStyle.utils.book_append_sheet(wb, ws, "Artworks");
    XLSXStyle.writeFile(wb, filename);
  });
}

export const BulkImportDialog = ({ open, onOpenChange, onSuccess, ownerId, userRole }: Props) => {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<Step>("upload");
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [importedArtworks, setImportedArtworks] = useState<ImportedArtwork[]>([]);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setRows([]);
    setStep("upload");
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);
    setImportedArtworks([]);
    setDroppedFiles([]);
    setImageProgress(0);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

      if (json.length < 2) { toast.error("Spreadsheet appears empty"); return; }

      const headers = (json[0] as string[]).map(String);

      // Detect multi-size layout
      const { groups: sizeGroupDefs, isSizeLayout } = detectSizeGroups(headers);

      // Build simple column mapping (skip columns that belong to size groups when in size layout)
      const sizeColIndices = new Set<number>();
      if (isSizeLayout) {
        for (const g of sizeGroupDefs) {
          if (g.height != null) sizeColIndices.add(g.height);
          if (g.width != null) sizeColIndices.add(g.width);
          if (g.editionCount != null) sizeColIndices.add(g.editionCount);
          if (g.artistProofs != null) sizeColIndices.add(g.artistProofs);
          if (g.price != null) sizeColIndices.add(g.price);
        }
      }

      const colMap: Record<number, string> = {};
      headers.forEach((h, i) => {
        if (isSizeLayout && sizeColIndices.has(i)) return;
        const key = h.toLowerCase().trim();
        if (COLUMN_MAP[key] && !Object.values(colMap).includes(COLUMN_MAP[key])) {
          colMap[i] = COLUMN_MAP[key];
        }
      });

      if (!Object.values(colMap).includes("title")) {
        toast.error("No 'Title' column found in spreadsheet");
        return;
      }

      const parsed: ParsedRow[] = [];
      for (let i = 1; i < json.length; i++) {
        const row = json[i] as unknown[];
        if (!row || row.length === 0) continue;

        const r: ParsedRow = {
          title: "", artworkType: "", series: "", year: null, medium: "", support: "",
          height: null, width: null, depth: null, signed: "", location: "", provenance: "",
          exhibitionHistory: "", description: "", imageFilename: "", selected: true,
          sizes: [], price: null, currency: "EUR",
        };

        // Map simple columns
        for (const [colIdx, field] of Object.entries(colMap)) {
          const val = row[Number(colIdx)];
          if (val == null || val === "") continue;
          if (field === "year" || field === "height" || field === "width" || field === "depth" || field === "price") {
            (r as any)[field] = parseNumber(val);
          } else {
            (r as any)[field] = String(val).trim();
          }
        }

        // Parse size groups
        if (isSizeLayout) {
          const sizes: SizeGroup[] = [];
          for (const g of sizeGroupDefs) {
            const h = g.height != null ? parseNumber(row[g.height]) : null;
            const w = g.width != null ? parseNumber(row[g.width]) : null;
            const ec = g.editionCount != null ? parseNumber(row[g.editionCount]) : null;
            const ap = g.artistProofs != null ? parseNumber(row[g.artistProofs]) : null;
            const p = g.price != null ? parseNumber(row[g.price]) : null;
            // Only add if there's at least a height or width
            if (h || w) {
              sizes.push({ height: h, width: w, editionCount: ec, artistProofs: ap, price: p });
            }
          }
          r.sizes = sizes;
          // For non-size-layout fields, use first size as fallback for dimensions
          if (sizes.length > 0 && !r.height) r.height = sizes[0].height;
          if (sizes.length > 0 && !r.width) r.width = sizes[0].width;
        }

        if (r.title) parsed.push(r);
      }

      if (parsed.length === 0) { toast.error("No valid rows found"); return; }

      setRows(parsed);
      setStep("preview");
    } catch {
      toast.error("Failed to parse file");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleRow = (index: number) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));
  };

  const toggleAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const SIZE_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  const handleImport = async () => {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) { toast.error("No rows selected"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); return; }

    setStep("importing");
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);

    let imported = 0;
    let errors = 0;
    const results: ImportedArtwork[] = [];

    const effectiveOwnerForSeries = ownerId || user.id;
    const uniqueSeries = [...new Set(selected.map((r) => r.series).filter(Boolean))];
    for (const name of uniqueSeries) {
      await supabase.from("series_groups").insert({ user_id: effectiveOwnerForSeries, name }).select();
    }

    for (let i = 0; i < selected.length; i++) {
      const r = selected[i];
      const effectiveOwnerId = ownerId || user.id;
      const activeRole = localStorage.getItem("activeRole") || "artist";
      
      const isPhotography = r.artworkType.toLowerCase() === "photography";
      const hasSizes = r.sizes.length > 0;

      const { data: artworkData, error } = await supabase.from("artworks").insert({
        owner_id: effectiveOwnerId,
        title: r.title,
        artwork_type: r.artworkType || null,
        series: r.series || null,
        year: r.year,
        medium: r.medium || null,
        support: r.support || null,
        height: hasSizes ? null : r.height,
        width: hasSizes ? null : r.width,
        depth: r.depth,
        signed: r.signed || null,
        artwork_location: r.location || null,
        provenance: r.provenance || null,
        exhibition_history: r.exhibitionHistory || null,
        description: r.description || null,
        role_context: activeRole,
        is_unique: !hasSizes && !isPhotography,
        price: hasSizes ? null : r.price,
      } as any).select("id").single();

      if (error || !artworkData) {
        errors++;
      } else {
        imported++;
        results.push({
          id: artworkData.id,
          title: r.title,
          imageFilename: r.imageFilename,
          matched: false,
        });

        // Create artwork_sizes and edition_items for multi-size artworks
        if (hasSizes) {
          for (let s = 0; s < r.sizes.length; s++) {
            const size = r.sizes[s];
            const sizeLabel = SIZE_LABELS[s] || String(s + 1);

            const { data: sizeData } = await supabase.from("artwork_sizes").insert({
              artwork_id: artworkData.id,
              size_label: sizeLabel,
              height: size.height,
              width: size.width,
              edition_count: size.editionCount || 1,
              artist_proofs: size.artistProofs || 0,
              price: size.price,
              currency: r.currency || "EUR",
            }).select("id").single();

            // Create edition items for this size
            if (sizeData) {
              const edCount = size.editionCount || 1;
              const apCount = size.artistProofs || 0;
              const editionItems: any[] = [];

              for (let e = 1; e <= edCount; e++) {
                editionItems.push({
                  artwork_size_id: sizeData.id,
                  edition_label: `${e}/${edCount}`,
                  is_ap: false,
                  status: "available",
                });
              }
              for (let a = 1; a <= apCount; a++) {
                editionItems.push({
                  artwork_size_id: sizeData.id,
                  edition_label: `${a}AP`,
                  is_ap: true,
                  status: "available",
                });
              }

              if (editionItems.length > 0) {
                await supabase.from("edition_items").insert(editionItems);
              }
            }
          }
        }
      }

      setProgress(((i + 1) / selected.length) * 100);
      setImportedCount(imported);
      setErrorCount(errors);
    }

    setImportedArtworks(results);

    if (errors === 0) {
      toast.success(`Successfully imported ${imported} artworks`);
    } else {
      toast.warning(`Imported ${imported} artworks, ${errors} failed`);
    }

    onSuccess();
  };

  // Image drag-drop handling
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) { toast.error("No image files found"); return; }
    setDroppedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    setDroppedFiles((prev) => [...prev, ...files]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  /** Split a cell value like "img1.jpg; img2.jpg, img3.jpg" into normalized names */
  const parseImageFilenames = (raw: string): string[] => {
    if (!raw) return [];
    return raw.split(/[;,]/).map((s) => normalizeFilename(s.trim())).filter(Boolean);
  };

  // Match dropped files to artworks by filename (supports multiple filenames per artwork)
  const getMatches = () => {
    const matches: { file: File; artwork: ImportedArtwork; displayOrder: number }[] = [];
    const unmatched: File[] = [];

    for (const file of droppedFiles) {
      const normFile = normalizeFilename(file.name);
      let matched = false;
      for (const artwork of importedArtworks) {
        const filenames = parseImageFilenames(artwork.imageFilename);
        const idx = filenames.indexOf(normFile);
        if (idx !== -1) {
          matches.push({ file, artwork, displayOrder: idx });
          matched = true;
          break;
        }
      }
      if (!matched) unmatched.push(file);
    }
    return { matches, unmatched };
  };

  const handleUploadImages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); return; }

    const { matches } = getMatches();
    if (matches.length === 0) { toast.error("No images matched to artworks"); return; }

    setStep("uploading");
    setImageProgress(0);

    let uploaded = 0;
    for (let i = 0; i < matches.length; i++) {
      const { file, artwork, displayOrder } = matches[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${artwork.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("artwork-images")
        .upload(path, file);

      if (!uploadError) {
        await supabase.from("artwork_images").insert({
          artwork_id: artwork.id,
          storage_path: path,
          display_order: displayOrder,
        });
        uploaded++;
        setImportedArtworks((prev) =>
          prev.map((a) => (a.id === artwork.id ? { ...a, matched: true } : a))
        );
      }

      setImageProgress(((i + 1) / matches.length) * 100);
    }

    toast.success(`Uploaded ${uploaded} images`);
    onSuccess();
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const { matches, unmatched } = step === "images" || step === "uploading" ? getMatches() : { matches: [], unmatched: [] };
  const hasImageFilenames = importedArtworks.some((a) => a.imageFilename);
  const hasSizes = rows.some((r) => r.sizes.length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Artworks</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <FileSpreadsheet className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Upload a spreadsheet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Excel (.xlsx, .xls) or CSV files supported
              </p>
            </div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" /> Choose File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
            />
            <div className="text-xs text-muted-foreground mt-4 max-w-sm text-center">
              Download a template to get started:
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {userRole !== "collector" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => downloadTemplate(ARTIST_UNIQUE_HEADERS, "artist-unique-template.xlsx")}
                  >
                    <Download className="w-3 h-3" /> Unique Works
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => downloadTemplate(ARTIST_EDITIONS_HEADERS, "artist-editions-template.xlsx")}
                  >
                    <Download className="w-3 h-3" /> Editions
                  </Button>
                </>
              )}
              {userRole !== "artist" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => downloadTemplate(COLLECTOR_UNIQUE_HEADERS, "collector-unique-template.xlsx")}
                  >
                    <Download className="w-3 h-3" /> Unique Works
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => downloadTemplate(COLLECTOR_EDITIONS_HEADERS, "collector-editions-template.xlsx")}
                  >
                    <Download className="w-3 h-3" /> Editions
                  </Button>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2 max-w-sm text-center">
              Or upload your own spreadsheet — just make sure it has a <strong>Title</strong> column.
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedCount} of {rows.length} artworks selected
                {hasSizes && " · Multi-size layout detected"}
              </p>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {rows.every((r) => r.selected) ? "Deselect all" : "Select all"}
              </Button>
            </div>

            <div className="border border-border rounded-sm overflow-hidden">
              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="p-2 text-left w-8"></th>
                      <th className="p-2 text-left">Title</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Year</th>
                      <th className="p-2 text-left">Medium</th>
                      <th className="p-2 text-left">Dimensions</th>
                      {hasSizes && <th className="p-2 text-left">Sizes</th>}
                      <th className="p-2 text-left">Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-t border-border cursor-pointer hover:bg-secondary/50 ${!r.selected ? "opacity-40" : ""}`}
                        onClick={() => toggleRow(i)}
                      >
                        <td className="p-2">
                          <div className={`w-4 h-4 rounded-sm border ${r.selected ? "bg-primary border-primary" : "border-border"} flex items-center justify-center`}>
                            {r.selected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </td>
                        <td className="p-2 font-medium">{r.title}</td>
                        <td className="p-2 text-muted-foreground">{r.artworkType}</td>
                        <td className="p-2 text-muted-foreground">{r.year || "—"}</td>
                        <td className="p-2 text-muted-foreground truncate max-w-[120px]">{r.medium || "—"}</td>
                        <td className="p-2 text-muted-foreground">
                          {r.sizes.length > 0
                            ? `${r.sizes[0].height} × ${r.sizes[0].width}`
                            : [r.height, r.width, r.depth].filter(Boolean).join(" × ") || "—"}
                        </td>
                        {hasSizes && (
                          <td className="p-2 text-muted-foreground">
                            {r.sizes.length > 0
                              ? r.sizes.map((s, si) => `${SIZE_LABELS[si]}: ${s.height}×${s.width}`).join(", ")
                              : "—"}
                          </td>
                        )}
                        <td className="p-2 text-muted-foreground truncate max-w-[100px]">{r.imageFilename || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetState}>Cancel</Button>
              <Button onClick={handleImport} disabled={selectedCount === 0}>
                Import {selectedCount} Artwork{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-8 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing artworks…</span>
                <span>{importedCount + errorCount} / {rows.filter((r) => r.selected).length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {errorCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {errorCount} failed
              </div>
            )}

            {progress >= 100 && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep("images")} className="gap-2">
                  <ImagePlus className="w-4 h-4" /> Add Images
                </Button>
                <Button onClick={() => { resetState(); onOpenChange(false); }}>
                  Done
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "images" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {hasImageFilenames
                ? "Drag-and-drop your artwork images below. They'll be matched to artworks by filename from your spreadsheet."
                : "Drag-and-drop your artwork images below. They'll be matched to artworks by filename."}
            </p>

            {/* Artwork list for reference */}
            {hasImageFilenames && (
              <div className="border border-border rounded-sm max-h-[20vh] overflow-y-auto">
                <div className="p-2 text-xs text-muted-foreground bg-secondary">Expected filenames from spreadsheet:</div>
                {importedArtworks.filter(a => a.imageFilename).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-1 text-xs border-t border-border">
                    <span className="font-medium truncate flex-1">{a.title}</span>
                    <span className="text-muted-foreground truncate max-w-[200px]">{a.imageFilename}</span>
                    {a.matched && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => imageInputRef.current?.click()}
              className={`border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-foreground/40"
              }`}
            >
              <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drop images here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Match results */}
            {droppedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {matches.length} matched · {unmatched.length} unmatched · {droppedFiles.length} total
                </p>

                <div className="border border-border rounded-sm max-h-[30vh] overflow-y-auto">
                  {matches.map(({ file, artwork }, i) => (
                    <div key={`m-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border last:border-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium truncate max-w-[200px]">{artwork.title}</span>
                    </div>
                  ))}
                  {unmatched.map((file, i) => (
                    <div key={`u-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border last:border-0 opacity-50">
                      <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-muted-foreground">No match</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
                Skip
              </Button>
              <Button onClick={handleUploadImages} disabled={matches.length === 0}>
                Upload {matches.length} Image{matches.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="py-8 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading images…</span>
                <span>{Math.round(imageProgress)}%</span>
              </div>
              <Progress value={imageProgress} className="h-2" />
            </div>

            {imageProgress >= 100 && (
              <div className="flex justify-end">
                <Button onClick={() => { resetState(); onOpenChange(false); }}>
                  Done
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
