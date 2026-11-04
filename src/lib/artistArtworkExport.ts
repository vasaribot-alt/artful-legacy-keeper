import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ExportArtwork = Tables<"artworks"> & {
  artwork_images: Pick<Tables<"artwork_images">, "storage_path" | "display_order">[];
  artwork_sizes: Tables<"artwork_sizes">[];
};

export function imageFilename(path: string): string {
  const clean = path.split(/[?#]/)[0];
  const name = clean.split("/").pop() || "";
  try { return decodeURIComponent(name); } catch { return name; }
}

// Full web address for an image: stored paths live in the artwork-images bucket,
// while legacy rows may already hold a complete URL.
export function imageWebAddress(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;
}

export function artworkExportRows(artworks: ExportArtwork[]) {
  return artworks.map(a => {
    const images = [...a.artwork_images].sort((x, y) => x.display_order - y.display_order);
    const paths = images.map(i => i.storage_path);
    if (!paths.length && a.image_url) paths.push(a.image_url);
    return {
      "Artwork ID": `GAWID-${String(a.global_artwork_id).padStart(8, "0")}`,
      "Catalogue number": a.catalogue_number || "",
      "CR number": a.cr_number ?? "",
      Title: a.title,
      Artist: a.artist_name || "",
      Year: a.year ?? "",
      Type: a.artwork_type || "",
      "Sub-category": a.sub_category || "",
      Medium: a.medium || "",
      Support: a.support || "",
      "Height (cm)": a.height ?? "",
      "Width (cm)": a.width ?? "",
      "Depth (cm)": a.depth ?? "",
      Dimensions: a.dimensions || "",
      Series: a.series || "",
      Description: a.description || "",
      Signed: a.signed || "",
      Unique: a.is_unique ? "Yes" : "No",
      "Edition number": a.edition_number || "",
      "Edition count": a.edition_count ?? "",
      "Artist proofs": a.artist_proofs ?? "",
      "Additional sizes": JSON.stringify(a.artwork_sizes.map(s => ({ label: s.size_label, height_cm: s.height, width_cm: s.width, editions: s.edition_count, artist_proofs: s.artist_proofs, price: s.price, currency: s.currency }))),
      Status: a.status,
      Location: a.artwork_location || "",
      Price: a.price ?? "",
      Currency: a.currency || "",
      Provenance: a.provenance || "",
      "Exhibition history": a.exhibition_history || "",
      "Image filenames": paths.map(imageFilename).join("; "),
      "Image web addresses": paths.map(imageWebAddress).join("; "),
      "Image storage paths": paths.join("; "),
      "Created at": a.created_at,
    };
  });
}

// Excel also interprets formulas in CSVs; neutralise artist-entered formula-like text.
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function createArtworkExport(artworks: ExportArtwork[], format: "csv" | "xlsx"): Blob {
  const rows = artworkExportRows(artworks);
  if (!rows.length) throw new Error("There are no artworks to export.");
  if (format === "csv") {
    const headers = Object.keys(rows[0]);
    const csv = [headers.map(csvCell).join(","), ...rows.map(r => Object.values(r).map(csvCell).join(","))].join("\r\n");
    return new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  }
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 24 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Artworks");
  const images = artworks.flatMap(a => a.artwork_images.map(i => ({
    "Artwork ID": `GAWID-${String(a.global_artwork_id).padStart(8, "0")}`,
    Title: a.title, "Image filename": imageFilename(i.storage_path), "Web address": imageWebAddress(i.storage_path), "Storage path": i.storage_path, "Display order": i.display_order,
  })));
  if (images.length) XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(images), "Images");
  return new Blob([XLSX.write(book, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function loadOwnArtistArtworks(): Promise<ExportArtwork[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Please sign in to export your artworks.");
  const result: ExportArtwork[] = [];
  const pageSize = 200;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from("artworks")
      .select("*, artwork_images(storage_path, display_order), artwork_sizes(*)")
      .eq("owner_id", user.id).eq("role_context", "artist")
      .order("created_at").order("id").range(from, from + pageSize - 1);
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return result;
}

export async function deliverArtworkExport(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if ((error as DOMException).name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}