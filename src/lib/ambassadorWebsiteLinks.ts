import { prepareArtistWebsiteDirectory, type ArtistWebsiteEntry, type PreparedArtistWebsiteEntry } from "./artistWebsiteDirectory";

const nameKey = (name: string) => name.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();

/** Match public names only, and refuse ambiguous matches instead of guessing. */
export function ambassadorWebsiteLinks(entries: ArtistWebsiteEntry[]) {
  const byName = new Map<string, PreparedArtistWebsiteEntry | null>();
  for (const entry of prepareArtistWebsiteDirectory(entries)) {
    const key = nameKey(entry.full_name);
    byName.set(key, byName.has(key) ? null : entry);
  }
  return (name: string) => byName.get(nameKey(name)) ?? null;
}