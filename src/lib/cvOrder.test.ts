import { describe, expect, it } from "vitest";
import { sortCvEntriesByYear } from "./cvOrder";

describe("sortCvEntriesByYear", () => {
  it("puts newest year first regardless of the order entries were added", () => {
    const sorted = sortCvEntriesByYear([{ year: "2010" }, { year: "2024" }, { year: "2015" }]);
    expect(sorted.map((e) => e.year)).toEqual(["2024", "2015", "2010"]);
  });
  it("uses the end year of a range and puts entries without a year last", () => {
    const sorted = sortCvEntriesByYear([{ year: "" }, { year: "2012" }, { year: "2005–2018" }]);
    expect(sorted.map((e) => e.year)).toEqual(["2005–2018", "2012", ""]);
  });
});
