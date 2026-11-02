import { describe, expect, it } from "vitest";
import { attachArtistArchiveUsage } from "./artistArchiveUsage";

describe("artist archive usage", () => {
  const rows = [{ user_id: "artist-a" }, { user_id: "artist-b" }];
  it("attaches sketchbook counts only to their owner", () => {
    const result = attachArtistArchiveUsage(rows, [{ user_id: "artist-b", sketchbook_count: 3, archival_document_count: 5 }]);
    expect(result.map((row) => row.sketchbook_count)).toEqual([0, 3]);
  });
  it("attaches archival document counts only to their owner", () => {
    const result = attachArtistArchiveUsage(rows, [{ user_id: "artist-b", sketchbook_count: 3, archival_document_count: 5 }]);
    expect(result.map((row) => row.archival_document_count)).toEqual([0, 5]);
  });
});