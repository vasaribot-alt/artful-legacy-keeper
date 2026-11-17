export interface ArtistWebsiteEntry {
  full_name: string;
  slug: string;
  custom_domain?: string | null;
}

export interface PreparedArtistWebsiteEntry {
  full_name: string;
  slug: string;
  /** Absolute URL to the artist's website: their own domain when approved, otherwise their GARF site. */
  href: string;
  /** True when the link leaves GARF for the artist's own domain. */
  external: boolean;
}

export function prepareArtistWebsiteDirectory(entries: ArtistWebsiteEntry[]): PreparedArtistWebsiteEntry[] {
  return entries
    .filter((entry) => entry.full_name.trim() && entry.slug.trim())
    .map((entry) => {
      const domain = entry.custom_domain?.trim() || "";
      return {
        full_name: entry.full_name.trim(),
        slug: entry.slug.trim(),
        href: domain ? `https://${domain}` : `/site/${encodeURIComponent(entry.slug.trim())}`,
        external: Boolean(domain),
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}
