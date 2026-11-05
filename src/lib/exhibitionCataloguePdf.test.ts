import { describe, expect, it } from "vitest";
import { catalogueWorkPages, fitCatalogueImage } from "./exhibitionCataloguePdf";

describe("catalogue layouts", () => {
  it("puts one work on each page in the single layout", () => {
    expect(catalogueWorkPages(["a", "b", "c"], "single")).toEqual([["a"], ["b"], ["c"]]);
  });
  it("puts two works per page without dropping an odd final work", () => {
    expect(catalogueWorkPages(["a", "b", "c"], "paired")).toEqual([["a", "b"], ["c"]]);
  });
  it("fits portrait images without cropping", () => {
    expect(fitCatalogueImage(100, 200, 300, 300)).toEqual({ width: 150, height: 300 });
  });
  it("fits landscape images without cropping", () => {
    expect(fitCatalogueImage(200, 100, 300, 300)).toEqual({ width: 300, height: 150 });
  });
});