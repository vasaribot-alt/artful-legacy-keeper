import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

/**
 * Export selected artworks to an Artlogic-compatible .xlsx file.
 *
 * Column headers match Artlogic's native import spelling so the file drops
 * straight into a gallery's Artlogic account. We only emit columns GARF can
 * populate from its own schema — Artlogic tolerates missing columns on import.
 */

const ARTLOGIC_HEADERS = [
  "Stock number",
  "Artist",
  "Title",
  "Year",
  "Medium and support",
  "Dimensions",
  "Signed and dated",
  "Series",
  "This artwork is a print or edition",
  "Edition number",
  "Edition total",
  "Artist's proof total",
  "Status",
  "Availability",
  "Location",
  "Retail currency",
  "Retail price",
  "Provenance",
  "Exhibitions",
  "Catalogue raisonné",
  "Commentary or description",
  "Copyright line",
  "Sold to",
  "Sale date",
  "Main image URL (large)",
  "Secondary images URLs (large)",
] as const;

const formatDimensions = (h?: number | null, w?: number | null, d?: number | null): string => {
  const parts: string[] = [];
  if (h != null) parts.push(String(h));
  if (w != null) parts.push(String(w));
  if (d != null) parts.push(String(d));
  if (parts.length === 0) return "";
  return `${parts.join(" x ")} cm`;
};

const publicUrl = (path: string) =>
  supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;

const sanitize = (name: string) => name.replace(/[^a-z0-9\-_]+/gi, "_").replace(/^_+|_+$/g, "");

export interface ArtlogicExportOptions {
  artworkIds: string[];
  /** Filename prefix, e.g. artist name or portfolio name. */
  filenameBase?: string;
}

export async function exportArtworksToArtlogic({
  artworkIds,
  filenameBase = "GARF_export",
}: ArtlogicExportOptions): Promise<{ count: number; filename: string }> {
  if (artworkIds.length === 0) {
    throw new Error("No artworks selected for export.");
  }

  // Fetch artwork rows
  const { data: artworks, error } = await supabase
    .from("artworks")
    .select(
      "id, global_artwork_id, cr_number, catalogue_number, artist_name, title, year, medium, support, dimensions, height, width, depth, signed, series, is_unique, edition_number, edition_count, artist_proofs, status, artwork_location, currency, price, provenance, exhibition_history, description, buyer_name, sold_date"
    )
    .in("id", artworkIds);

  if (error) throw error;
  if (!artworks || artworks.length === 0) {
    throw new Error("No artworks found.");
  }

  // Fetch images for all artworks in one query
  const { data: imageRows } = await supabase
    .from("artwork_images")
    .select("artwork_id, storage_path, display_order")
    .in("artwork_id", artworkIds)
    .order("display_order");

  const imagesByArtwork = new Map<string, string[]>();
  (imageRows || []).forEach((row: any) => {
    const arr = imagesByArtwork.get(row.artwork_id) || [];
    arr.push(publicUrl(row.storage_path));
    imagesByArtwork.set(row.artwork_id, arr);
  });

  // Build rows in the artworks order matching artworkIds
  const orderIndex = new Map(artworkIds.map((id, i) => [id, i]));
  const ordered = [...artworks].sort(
    (a: any, b: any) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0)
  );

  const rows = ordered.map((a: any) => {
    const images = imagesByArtwork.get(a.id) || [];
    const mediumAndSupport = [a.medium, a.support].filter(Boolean).join(", ");
    const dimensions = a.dimensions || formatDimensions(a.height, a.width, a.depth);
    const stockNumber =
      a.global_artwork_id != null
        ? `GAWID-${String(a.global_artwork_id).padStart(8, "0")}`
        : a.catalogue_number || "";
    const availability =
      a.status === "sold" ? "Sold" : a.status === "available" ? "For sale" : a.status || "";
    const isEdition = a.is_unique === false ? "Yes" : "No";

    return {
      "Stock number": stockNumber,
      Artist: a.artist_name || "",
      Title: a.title || "",
      Year: a.year ?? "",
      "Medium and support": mediumAndSupport,
      Dimensions: dimensions,
      "Signed and dated": a.signed || "",
      Series: a.series || "",
      "This artwork is a print or edition": isEdition,
      "Edition number": a.edition_number || "",
      "Edition total": a.edition_count ?? "",
      "Artist's proof total": a.artist_proofs ?? "",
      Status: a.status || "",
      Availability: availability,
      Location: a.artwork_location || "",
      "Retail currency": a.currency || "",
      "Retail price": a.price ?? "",
      Provenance: a.provenance || "",
      Exhibitions: a.exhibition_history || "",
      "Catalogue raisonné": a.cr_number ? `CR ${a.cr_number}` : "",
      "Commentary or description": a.description || "",
      "Copyright line": a.artist_name ? `© ${a.artist_name}` : "",
      "Sold to": a.buyer_name || "",
      "Sale date": a.sold_date || "",
      "Main image URL (large)": images[0] || "",
      "Secondary images URLs (large)": images.slice(1).join("; "),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...ARTLOGIC_HEADERS] });

  // Column widths for readability
  worksheet["!cols"] = ARTLOGIC_HEADERS.map((h) => {
    if (h === "Title" || h === "Commentary or description" || h === "Provenance" || h === "Exhibitions")
      return { wch: 40 };
    if (h.includes("URL")) return { wch: 60 };
    if (h === "Medium and support" || h === "Dimensions" || h === "Location") return { wch: 28 };
    return { wch: 18 };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Artworks");

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${sanitize(filenameBase)}_${date}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return { count: rows.length, filename };
}
