import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

/**
 * Collector Insurance Schedule export.
 *
 * Produces a valuation-focused .xlsx suitable for handing to an insurer or
 * broker: identification, physical description, location, all monetary values,
 * appraisal metadata and image URLs. Totals row summing the insured value.
 */

const HEADERS = [
  "Stock number",
  "Artist",
  "Title",
  "Year",
  "Medium",
  "Dimensions",
  "Edition",
  "Signed",
  "Status",
  // Location
  "Facility",
  "Room",
  "Cabinet",
  "Shelf",
  "Box",
  "Free-text location",
  // Environmental / hazards
  "Environmental notes",
  "Hazard notes",
  // Valuation
  "Currency",
  "Purchase price",
  "Acquisition cost (all-in)",
  "Original retail (MSRP)",
  "Current market value",
  "Estimated value",
  "Appraised value",
  "Appraised on",
  "Appraised by",
  "Last sold price",
  "Last sold on",
  "Replacement value",
  "Reserve price",
  "Restoration cost",
  // Provenance snapshot
  "Provenance",
  "Notes",
  // Images
  "Main image URL",
  "Secondary image URLs",
] as const;

const publicUrl = (path: string) =>
  supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;

const sanitize = (s: string) =>
  s.replace(/[^a-z0-9\-_]+/gi, "_").replace(/^_+|_+$/g, "");

const fmtDims = (h?: number | null, w?: number | null, d?: number | null) => {
  const parts = [h, w, d].filter((v): v is number => v != null);
  return parts.length ? `${parts.join(" × ")} cm` : "";
};

/** Optional value/appraisal columns the user can toggle on/off. */
export const OPTIONAL_VALUE_COLUMNS = [
  "Purchase price",
  "Acquisition cost (all-in)",
  "Original retail (MSRP)",
  "Current market value",
  "Estimated value",
  "Appraised value",
  "Appraised on",
  "Appraised by",
  "Last sold price",
  "Last sold on",
  "Replacement value",
  "Reserve price",
  "Restoration cost",
] as const;

export type OptionalValueColumn = (typeof OPTIONAL_VALUE_COLUMNS)[number];

export interface InsuranceExportOptions {
  artworkIds: string[];
  filenameBase?: string;
  /** Which value column to use for the totals row. Defaults to replacement_value. Pass null to omit totals row. */
  totalBasis?:
    | "replacement_value"
    | "appraised_value"
    | "current_market_value"
    | "purchase_price"
    | null;
  /** Subset of optional value columns to include. Defaults to all. */
  includeValueColumns?: OptionalValueColumn[];
}

export async function exportInsuranceSchedule({
  artworkIds,
  filenameBase,
  totalBasis = "replacement_value",
  includeValueColumns,
}: InsuranceExportOptions): Promise<{ count: number; filename: string; total: number }> {
  if (artworkIds.length === 0) {
    throw new Error("No artworks selected for export.");
  }

  const { data: artworks, error } = await supabase
    .from("artworks")
    .select(
      [
        "id",
        "owner_id",
        "global_artwork_id",
        "cr_number",
        "catalogue_number",
        "artist_name",
        "title",
        "year",
        "medium",
        "support",
        "dimensions",
        "height",
        "width",
        "depth",
        "signed",
        "edition_number",
        "edition_count",
        "artist_proofs",
        "status",
        "artwork_location",
        "location_facility",
        "location_room",
        "location_cabinet",
        "location_shelf",
        "location_box",
        "env_temperature_note",
        "env_humidity_note",
        "env_light_note",
        "hazard_notes",
        "currency",
        "purchase_price",
        "acquisition_cost",
        "original_retail_price",
        "current_market_value",
        "estimated_value",
        "appraised_value",
        "appraised_at",
        "appraised_by",
        "last_sold_price",
        "last_sold_at",
        "replacement_value",
        "reserve_price",
        "restoration_cost",
        "provenance",
        "description",
      ].join(", ")
    )
    .in("id", artworkIds);

  if (error) throw error;
  if (!artworks || artworks.length === 0) throw new Error("No artworks found.");

  // Resolve owner names for artist fallback + filename
  const ownerIds = Array.from(new Set(artworks.map((a: any) => a.owner_id).filter(Boolean)));
  const namesByOwner = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", ownerIds);
    (profs || []).forEach((p: any) => {
      if (p.full_name) namesByOwner.set(p.user_id, p.full_name);
    });
  }
  const collectorName = ownerIds.length === 1 ? namesByOwner.get(ownerIds[0]) || "" : "";

  // Images
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

  // Preserve caller order
  const orderIndex = new Map(artworkIds.map((id, i) => [id, i]));
  const ordered = [...artworks].sort(
    (a: any, b: any) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0)
  );

  let total = 0;
  const rows = ordered.map((a: any) => {
    const images = imagesByArtwork.get(a.id) || [];
    const stockNumber =
      a.global_artwork_id != null
        ? `GAWID-${String(a.global_artwork_id).padStart(8, "0")}`
        : a.catalogue_number || "";
    const dimensions = a.dimensions || fmtDims(a.height, a.width, a.depth);
    const edition =
      a.edition_number && a.edition_count
        ? `${a.edition_number}/${a.edition_count}${a.artist_proofs ? ` + ${a.artist_proofs} AP` : ""}`
        : "";
    const envNotes = [
      a.env_temperature_note && `Temp: ${a.env_temperature_note}`,
      a.env_humidity_note && `RH: ${a.env_humidity_note}`,
      a.env_light_note && `Light: ${a.env_light_note}`,
    ]
      .filter(Boolean)
      .join(" · ");

    const basisVal = Number(a[totalBasis]) || 0;
    total += basisVal;

    return {
      "Stock number": stockNumber,
      Artist: a.artist_name || namesByOwner.get(a.owner_id) || "",
      Title: a.title || "",
      Year: a.year ?? "",
      Medium: [a.medium, a.support].filter(Boolean).join(", "),
      Dimensions: dimensions,
      Edition: edition,
      Signed: a.signed || "",
      Status: a.status || "",
      Facility: a.location_facility || "",
      Room: a.location_room || "",
      Cabinet: a.location_cabinet || "",
      Shelf: a.location_shelf || "",
      Box: a.location_box || "",
      "Free-text location": a.artwork_location || "",
      "Environmental notes": envNotes,
      "Hazard notes": a.hazard_notes || "",
      Currency: a.currency || "",
      "Purchase price": a.purchase_price ?? "",
      "Acquisition cost (all-in)": a.acquisition_cost ?? "",
      "Original retail (MSRP)": a.original_retail_price ?? "",
      "Current market value": a.current_market_value ?? "",
      "Estimated value": a.estimated_value ?? "",
      "Appraised value": a.appraised_value ?? "",
      "Appraised on": a.appraised_at || "",
      "Appraised by": a.appraised_by || "",
      "Last sold price": a.last_sold_price ?? "",
      "Last sold on": a.last_sold_at || "",
      "Replacement value": a.replacement_value ?? "",
      "Reserve price": a.reserve_price ?? "",
      "Restoration cost": a.restoration_cost ?? "",
      Provenance: a.provenance || "",
      Notes: a.description || "",
      "Main image URL": images[0] || "",
      "Secondary image URLs": images.slice(1).join("; "),
    };
  });

  // Add a totals row for the chosen basis
  const basisLabel: Record<string, string> = {
    replacement_value: "Replacement value",
    appraised_value: "Appraised value",
    current_market_value: "Current market value",
    purchase_price: "Purchase price",
  };
  const totalRow: Record<string, any> = {};
  HEADERS.forEach((h) => (totalRow[h] = ""));
  totalRow["Stock number"] = `TOTAL (${basisLabel[totalBasis]})`;
  totalRow[basisLabel[totalBasis]] = total;

  const worksheet = XLSX.utils.json_to_sheet([...rows, totalRow], {
    header: [...HEADERS],
  });

  worksheet["!cols"] = HEADERS.map((h) => {
    if (h === "Title" || h === "Provenance" || h === "Notes") return { wch: 40 };
    if (h.includes("URL")) return { wch: 60 };
    if (h === "Medium" || h === "Dimensions" || h === "Free-text location")
      return { wch: 28 };
    if (h.includes("value") || h.includes("price") || h.includes("cost")) return { wch: 18 };
    return { wch: 18 };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Insurance Schedule");

  const date = new Date().toISOString().slice(0, 10);
  const namePart = collectorName ? sanitize(collectorName) : "collection";
  const suffix = filenameBase ? `_${sanitize(filenameBase)}` : "";
  const filename = `${namePart}_GARF_insurance${suffix}_${date}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return { count: rows.length, filename, total };
}
