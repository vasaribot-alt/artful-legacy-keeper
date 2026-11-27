import { describe, expect, it } from "vitest";
import { artistMetadata, pageUrl, publicPages, sitemapXml } from "./publicSeo";

describe("public search URLs", () => {
  it("uses the project's public domain and the page itself", () => {
    expect(pageUrl("/site/lola-szent-gyorgyi/works")).toBe("https://globalartistregistry.org/site/lola-szent-gyorgyi/works");
    expect(pageUrl("/about")).toBe("https://globalartistregistry.org/about");
  });
  it("lists public destinations without exposing workspace or auth routes", () => {
    expect(Object.keys(publicPages)).toContain("/founding-artists");
    for (const path of ["/dashboard", "/profile", "/foundation/admin", "/files", "/login", "/register", "/partners/hdlu-zagreb", "/storage-tiers", "/collector-access"]) expect(Object.keys(publicPages)).not.toContain(path);
  });
  it("uses artist names and the current section", () => {
    expect(artistMetadata("Elin Bergstø", "Works").title).toBe("Elin Bergstø — Works | GARF");
  });
  it("deduplicates sitemap entries and never invents modification dates", () => {
    const xml = sitemapXml(["/", "/about", "/about"]);
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).not.toContain("lastmod");
  });
});