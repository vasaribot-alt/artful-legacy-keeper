import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  getPublicUrl: vi.fn((p: string) => ({ data: { publicUrl: `https://cdn.test/artwork-images/${p}` } })),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    storage: { from: () => ({ getPublicUrl: mocks.getPublicUrl }) },
  },
}));
import { artworkExportRows, createArtworkExport, csvCell, imageFilename, imageWebAddress, loadOwnArtistArtworks, type ExportArtwork } from "./artistArtworkExport";

function readBlob(blob: Blob, asText = false): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result === null ? reject(new Error("Empty file")) : resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    if (asText) reader.readAsText(blob); else reader.readAsArrayBuffer(blob);
  });
}

const artwork = {
  id: "art-1", global_artwork_id: 100001, title: 'A, "work"', year: 1994,
  height: 30, width: 40, depth: null, price: 0, is_unique: true,
  artwork_images: [{ storage_path: "owner/second.jpg", display_order: 2 }, { storage_path: "owner/first%20image.jpg", display_order: 0 }],
  artwork_sizes: [],
} as ExportArtwork;

describe("artist artwork exports", () => {
  beforeEach(() => vi.clearAllMocks());
  it("includes all linked image filenames in display order and cm dimensions", () => {
    const row = artworkExportRows([artwork])[0];
    expect(row["Artwork ID"]).toBe("GAWID-00100001");
    expect(row["Image filenames"]).toBe("first image.jpg; second.jpg");
    expect(row["Image web addresses"]).toBe("https://cdn.test/artwork-images/owner/first%20image.jpg; https://cdn.test/artwork-images/owner/second.jpg");
    expect(row["Height (cm)"]).toBe(30);
    expect(row.Price).toBe(0);
  });
  it("exports artworks without an image rather than dropping them", () => {
    expect(artworkExportRows([{ ...artwork, artwork_images: [] }])).toHaveLength(1);
    expect(artworkExportRows([{ ...artwork, artwork_images: [] }])[0]["Image filenames"]).toBe("");
  });
  it("generates an Excel workbook with artwork records and image filenames", async () => {
    const bytes = await readBlob(createArtworkExport([artwork], "xlsx"));
    const book = XLSX.read(bytes, { type: "array" });
    expect(book.SheetNames).toEqual(["Artworks", "Images"]);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets.Artworks);
    expect(rows[0].Title).toBe('A, "work"');
    expect(XLSX.utils.sheet_to_json(book.Sheets.Images)).toHaveLength(2);
  });
  it("generates UTF-8 CSV with quoted titles and filenames", async () => {
    const csv = await readBlob(createArtworkExport([artwork], "csv"), true);
    expect(csv).toContain('"A, ""work"""');
    expect(csv).toContain('"first image.jpg; second.jpg"');
  });
  it("prevents artist-entered CSV formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe('"\'=HYPERLINK(1)"');
    expect(csvCell(-4)).toBe('"-4"');
    expect(imageFilename("https://example.org/a%20b.jpg?token=123")).toBe("a b.jpg");
  });
  it("keeps complete image URLs as their own web address", () => {
    expect(imageWebAddress("https://example.org/a%20b.jpg")).toBe("https://example.org/a%20b.jpg");
    expect(imageWebAddress("owner/x.jpg")).toBe("https://cdn.test/artwork-images/owner/x.jpg");
  });
  it("always scopes exports to the signed-in owner and artist role and paginates", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query);
    query.range.mockResolvedValueOnce({ data: Array.from({ length: 200 }, () => artwork), error: null }).mockResolvedValueOnce({ data: [artwork], error: null });
    mocks.from.mockReturnValue(query);
    expect(await loadOwnArtistArtworks()).toHaveLength(201);
    expect(query.eq).toHaveBeenCalledWith("owner_id", "owner-1");
    expect(query.eq).toHaveBeenCalledWith("role_context", "artist");
    expect(query.range).toHaveBeenNthCalledWith(2, 200, 399);
  });
  it("does not query artworks when signed out", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(loadOwnArtistArtworks()).rejects.toThrow("Please sign in");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});