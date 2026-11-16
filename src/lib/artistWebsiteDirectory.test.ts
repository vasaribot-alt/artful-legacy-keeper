import { describe, expect, it } from "vitest";
import { prepareArtistWebsiteDirectory } from "./artistWebsiteDirectory";

describe("artist website directory", () => {
  it("lists named artists with GARF homepages alphabetically", () => {
    expect(prepareArtistWebsiteDirectory([
      { full_name: "Krešimira Gojanović", slug: "kresimira-gojanovic" },
      { full_name: " Alfred Freddy Krupa ", slug: "alfred-freddy-krupa" },
      { full_name: "", slug: "unnamed" },
      { full_name: "No homepage", slug: "" },
    ])).toEqual([
      { full_name: "Alfred Freddy Krupa", slug: "alfred-freddy-krupa" },
      { full_name: "Krešimira Gojanović", slug: "kresimira-gojanovic" },
    ]);
  });
});