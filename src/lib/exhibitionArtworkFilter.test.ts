import { describe, expect, it } from "vitest";
import { artworkSeriesOptions, filterExhibitionArtworks } from "./exhibitionArtworkFilter";

const artworks = [
  { id: "1", title: "Untitled", series: "Canopy" },
  { id: "2", title: "Window", series: "Canopy" },
  { id: "3", title: "Untitled", series: "Flags" },
  { id: "4", title: "Study", series: null },
  { id: "5", title: "Untitled", series: " " },
];

describe("exhibition artwork series filter", () => {
  it("narrows works to the chosen series", () => {
    expect(filterExhibitionArtworks(artworks, "series:Canopy", "").map(a => a.id)).toEqual(["1", "2"]);
  });
  it("combines title search with the chosen series", () => {
    expect(filterExhibitionArtworks(artworks, "series:Canopy", " untitled ").map(a => a.id)).toEqual(["1"]);
  });
  it("keeps unassigned works accessible and restores all works", () => {
    expect(filterExhibitionArtworks(artworks, "other", "").map(a => a.id)).toEqual(["4", "5"]);
    expect(filterExhibitionArtworks(artworks, "all", "")).toHaveLength(5);
  });
  it("lists each series once with its count and an unassigned fallback", () => {
    expect(artworkSeriesOptions(artworks)).toEqual([
      { value: "series:Canopy", label: "Canopy", count: 2 },
      { value: "series:Flags", label: "Flags", count: 1 },
      { value: "other", label: "Other Works", count: 2 },
    ]);
  });
});