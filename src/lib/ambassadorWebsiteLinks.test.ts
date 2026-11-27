import { describe, expect, it } from "vitest";
import { ambassadorWebsiteLinks } from "./ambassadorWebsiteLinks";

describe("ambassador public website links", () => {
  it("links an exact public artist match to their published GARF site", () => {
    const find = ambassadorWebsiteLinks([{ full_name: "Elin Bergstø", slug: "https-elinbergsto-no" }]);
    expect(find(" Elin Bergstø ")?.href).toBe("/site/https-elinbergsto-no");
  });
  it("uses an approved own domain when supplied by the public directory", () => {
    const find = ambassadorWebsiteLinks([{ full_name: "Alfred Freddy Krupa", slug: "alfred-freddy-krupa", custom_domain: "example.org" }]);
    expect(find("Alfred Freddy Krupa")?.href).toBe("https://example.org");
    expect(find("Alfred Freddy Krupa")?.external).toBe(true);
  });
  it("does not invent links for missing or ambiguous names", () => {
    const find = ambassadorWebsiteLinks([
      { full_name: "Same Name", slug: "first" },
      { full_name: "Same Name", slug: "second" },
    ]);
    expect(find("Same Name")).toBeNull();
    expect(find("Georgia Michaelides Saad")).toBeNull();
  });
});