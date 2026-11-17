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
      { full_name: "Alfred Freddy Krupa", slug: "alfred-freddy-krupa", href: "/site/alfred-freddy-krupa", external: false },
      { full_name: "Krešimira Gojanović", slug: "kresimira-gojanovic", href: "/site/kresimira-gojanovic", external: false },
    ]);
  });

  it("links to the artist's own domain when one is approved", () => {
    expect(prepareArtistWebsiteDirectory([
      { full_name: "Amelie Chabannes", slug: "amelie-chabannes", custom_domain: "ameliechabannes.com" },
      { full_name: "No domain yet", slug: "no-domain", custom_domain: null },
    ])).toEqual([
      { full_name: "Amelie Chabannes", slug: "amelie-chabannes", href: "https://ameliechabannes.com", external: true },
      { full_name: "No domain yet", slug: "no-domain", href: "/site/no-domain", external: false },
    ]);
  });
});