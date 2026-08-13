/**
 * Spreadsheet analysis utilities for the bulk artwork importer.
 *
 * Goals:
 * - Detect which columns in an uploaded spreadsheet map to GARF artwork fields.
 * - Parse messy real-world values (dimensions strings, medium+support combos).
 * - Surface warnings so the user can fix the file before importing.
 */

export type Confidence = "high" | "medium" | "low" | "none";

export interface ColumnMapping {
  sourceHeader: string;
  sourceIndex: number;
  targetField: string;
  targetLabel: string;
  confidence: Confidence;
  sampleValue: string;
}

export interface AnalysisResult {
  mappings: ColumnMapping[];
  unmappedHeaders: { header: string; index: number; sampleValue: string }[];
  issues: string[];
  detectedLayout: "single" | "multi-size" | "artlogic" | "unknown";
  rowCount: number;
}

export interface ParsedDimensions {
  height?: number;
  width?: number;
  depth?: number;
  note?: string;
}

export interface ParsedMediumSupport {
  medium?: string;
  support?: string;
}

/** Canonical GARF fields and human labels. */
export const TARGET_FIELDS: Record<string, string> = {
  title: "Title",
  artistName: "Artist Name",
  artworkType: "Category / Type",
  series: "Series",
  year: "Year",
  medium: "Medium",
  support: "Support",
  height: "Height (cm)",
  width: "Width (cm)",
  depth: "Depth (cm)",
  signed: "Signature / Dating",
  location: "Current Location",
  provenance: "Provenance",
  exhibitionHistory: "Exhibition History",
  description: "Description / Notes",
  imageFilename: "Image Filename / ID",
  price: "Price",
  currency: "Currency",
};

/** Header patterns grouped by confidence. */
const HEADER_PATTERNS: Record<string, { field: string; confidence: Confidence }[]> = {
  title: [
    { field: "title", confidence: "high" },
  ],
  artist: [
    { field: "artistName", confidence: "high" },
  ],
  "artist name": [
    { field: "artistName", confidence: "high" },
  ],
  category: [
    { field: "artworkType", confidence: "high" },
  ],
  type: [
    { field: "artworkType", confidence: "medium" },
  ],
  "artwork type": [
    { field: "artworkType", confidence: "high" },
  ],
  series: [
    { field: "series", confidence: "high" },
  ],
  year: [
    { field: "year", confidence: "high" },
  ],
  date: [
    { field: "year", confidence: "medium" },
  ],
  medium: [
    { field: "medium", confidence: "high" },
  ],
  "medium and support": [
    { field: "medium", confidence: "high" },
    { field: "support", confidence: "high" },
  ],
  support: [
    { field: "support", confidence: "high" },
  ],
  height: [
    { field: "height", confidence: "high" },
  ],
  "size height cm": [
    { field: "height", confidence: "high" },
  ],
  "size hight cm": [
    { field: "height", confidence: "high" },
  ],
  "høyde cm": [
    { field: "height", confidence: "high" },
  ],
  width: [
    { field: "width", confidence: "high" },
  ],
  "size width cm": [
    { field: "width", confidence: "high" },
  ],
  "bredde cm": [
    { field: "width", confidence: "high" },
  ],
  depth: [
    { field: "depth", confidence: "high" },
  ],
  "size depth cm": [
    { field: "depth", confidence: "high" },
  ],
  dimensions: [
    { field: "height", confidence: "medium" },
    { field: "width", confidence: "medium" },
    { field: "depth", confidence: "medium" },
  ],
  signed: [
    { field: "signed", confidence: "high" },
  ],
  signature: [
    { field: "signed", confidence: "high" },
  ],
  "signed and dated": [
    { field: "signed", confidence: "high" },
  ],
  location: [
    { field: "location", confidence: "high" },
  ],
  "current location": [
    { field: "location", confidence: "high" },
  ],
  provenance: [
    { field: "provenance", confidence: "high" },
  ],
  "exhibition history": [
    { field: "exhibitionHistory", confidence: "high" },
  ],
  exhibitions: [
    { field: "exhibitionHistory", confidence: "high" },
  ],
  description: [
    { field: "description", confidence: "high" },
  ],
  notes: [
    { field: "description", confidence: "medium" },
  ],
  merknader: [
    { field: "description", confidence: "medium" },
  ],
  "commentary or description": [
    { field: "description", confidence: "high" },
  ],
  "additional certificates": [
    { field: "description", confidence: "low" },
  ],
  image: [
    { field: "imageFilename", confidence: "high" },
  ],
  "image number / id": [
    { field: "imageFilename", confidence: "high" },
  ],
  "image number": [
    { field: "imageFilename", confidence: "high" },
  ],
  "image id": [
    { field: "imageFilename", confidence: "high" },
  ],
  filename: [
    { field: "imageFilename", confidence: "high" },
  ],
  images: [
    { field: "imageFilename", confidence: "high" },
  ],
  "main image url (large)": [
    { field: "imageFilename", confidence: "medium" },
  ],
  price: [
    { field: "price", confidence: "high" },
  ],
  pris: [
    { field: "price", confidence: "high" },
  ],
  "pris u/ramme": [
    { field: "price", confidence: "high" },
  ],
  "retail price": [
    { field: "price", confidence: "high" },
  ],
  currency: [
    { field: "currency", confidence: "high" },
  ],
  "retail currency": [
    { field: "currency", confidence: "high" },
  ],
};

/** Headers that indicate a size-group column in multi-size layouts. */
export const SIZE_HEADERS: Record<string, "height" | "width" | "editionCount" | "artistProofs" | "price"> = {
  "høyde cm": "height",
  height: "height",
  "size height cm": "height",
  "size hight cm": "height",
  "bredde cm": "width",
  width: "width",
  "size width cm": "width",
  opplag: "editionCount",
  edition: "editionCount",
  "edition count": "editionCount",
  ap: "artistProofs",
  "artist proofs": "artistProofs",
  "pris m/ramme": "price",
  pris: "price",
  price: "price",
};

function normalizeHeader(header: string): string {
  return String(header || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

export function parseNumber(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/**
 * Parse a dimensions string such as:
 *   "66.5 x 50 cm (unframed)\r\n71.5 x 59.5 cm (framed)"
 *   "30 x 22 cm"
 *   "200 x 150 x 5 cm"
 * Returns the first numeric triple found plus any trailing note.
 */
export function parseDimensions(input: string): ParsedDimensions {
  if (!input) return {};
  const cleaned = String(input)
    .replace(/_x000D_/g, "\r")
    .replace(/\r\n/g, " / ")
    .replace(/\r/g, " / ")
    .replace(/\n/g, " / ")
    .replace(/[×xX]/g, " x ")
    .replace(/,/g, ".")
    .replace(/cm/gi, "")
    .replace(/mm/gi, "")
    .replace(/"/g, "")
    .trim();

  // Try to find up to three decimal numbers separated by "x"
  const parts = cleaned.split("/")[0]; // use first listed measurement
  const numbers = parts.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];

  const noteMatch = String(input).match(/\(([^)]+)\)/);
  const note = noteMatch ? noteMatch[1].trim() : undefined;

  if (numbers.length >= 3) {
    return { height: numbers[0], width: numbers[1], depth: numbers[2], note };
  }
  if (numbers.length === 2) {
    return { height: numbers[0], width: numbers[1], note };
  }
  if (numbers.length === 1) {
    return { height: numbers[0], note };
  }
  return { note };
}

/**
 * Split a combined "Medium and support" field into separate values.
 * Heuristic: look for common support keywords after the medium description.
 */
export function splitMediumSupport(input: string): ParsedMediumSupport {
  if (!input) return {};
  const value = String(input).trim();
  const supportKeywords = [
    "canvas",
    "paper",
    "board",
    "panel",
    "wood",
    "aluminum",
    "aluminium",
    "steel",
    "bronze",
    "marble",
    "glass",
    "acrylic",
    "plexiglas",
    "plexiglass",
    "frame",
    "photograph",
    "print",
  ];

  const lower = value.toLowerCase();
  let splitIndex = -1;
  for (const keyword of supportKeywords) {
    const idx = lower.indexOf(keyword);
    if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
      splitIndex = idx;
    }
  }

  if (splitIndex === -1) {
    return { medium: value };
  }

  const medium = value.slice(0, splitIndex).trim().replace(/[,.;\-]+$/, "");
  const support = value.slice(splitIndex).trim();
  return { medium: medium || undefined, support: support || undefined };
}

function detectLayout(headers: string[]): AnalysisResult["detectedLayout"] {
  const lower = headers.map(normalizeHeader);
  const hasArtLogic = lower.includes("medium and support") || lower.includes("dimensions");
  const hasMultiSize = lower.filter((h) => h === "height" || h === "høyde cm" || h === "size height cm").length > 1;

  if (hasArtLogic) return "artlogic";
  if (hasMultiSize) return "multi-size";
  if (lower.includes("title")) return "single";
  return "unknown";
}

/**
 * Analyse a spreadsheet's headers and sample rows to produce a column mapping.
 */
export function analyzeSpreadsheet(
  headers: string[],
  sampleRows: unknown[][]
): AnalysisResult {
  const normalized = headers.map(normalizeHeader);
  const issues: string[] = [];
  const mappings: ColumnMapping[] = [];
  const unmappedHeaders: { header: string; index: number; sampleValue: string }[] = [];
  const claimedFields = new Set<string>();

  const layout = detectLayout(headers);
  if (layout === "artlogic") {
    issues.push("ArtLogic-style export detected. Dimensions and medium/support will be parsed automatically.");
  }

  normalized.forEach((h, i) => {
    const rawHeader = headers[i];
    const sample = sampleRows.slice(0, 3).map((r) => r[i]).filter((v) => v != null && String(v).trim() !== "").map(String);
    const sampleValue = sample.join("; ").slice(0, 80);

    const patterns = HEADER_PATTERNS[h];
    if (!patterns) {
      unmappedHeaders.push({ header: rawHeader, index: i, sampleValue });
      return;
    }

    for (const { field, confidence } of patterns) {
      // For medium+support combo, allow both to be claimed from the same source.
      const allowDuplicate = h === "medium and support";
      if (!allowDuplicate && claimedFields.has(field)) continue;

      claimedFields.add(field);
      mappings.push({
        sourceHeader: rawHeader,
        sourceIndex: i,
        targetField: field,
        targetLabel: TARGET_FIELDS[field] || field,
        confidence,
        sampleValue,
      });
    }
  });

  if (!claimedFields.has("title")) {
    issues.push("No 'Title' column detected. The spreadsheet must contain a title column to import artworks.");
  }

  if (!claimedFields.has("height") && !claimedFields.has("width") && !claimedFields.has("dimensions")) {
    issues.push("No dimension columns detected. Height/width/depth will be left empty.");
  }

  return {
    mappings,
    unmappedHeaders,
    issues,
    detectedLayout: layout,
    rowCount: sampleRows.length,
  };
}

/** Template headers designed for a gallery handover. */
export const GALLERY_HANDOVER_HEADERS = [
  "Artist",
  "Title",
  "Year",
  "Medium and support",
  "Dimensions",
  "Signed and dated",
  "Series",
  "Provenance",
  "Exhibitions",
  "Description",
  "Image filename",
  "Location",
  "Retail currency",
  "Retail price",
];
