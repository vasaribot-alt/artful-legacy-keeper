export interface ArtistWebsiteEntry {
  full_name: string;
  slug: string;
}

export function prepareArtistWebsiteDirectory(entries: ArtistWebsiteEntry[]) {
  return entries
    .filter((entry) => entry.full_name.trim() && entry.slug.trim())
    .map((entry) => ({ full_name: entry.full_name.trim(), slug: entry.slug.trim() }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}