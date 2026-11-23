export interface SeriesArtwork {
  title: string;
  series: string | null;
}

export function artworkSeriesOptions(artworks: SeriesArtwork[]) {
  const counts = new Map<string, number>();
  for (const artwork of artworks) {
    const series = artwork.series?.trim() || "";
    counts.set(series, (counts.get(series) || 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => !a ? 1 : !b ? -1 : a.localeCompare(b))
    .map(([name, count]) => ({
      value: name ? `series:${name}` : "other",
      label: name || "Other Works",
      count,
    }));
}

export function filterExhibitionArtworks<T extends SeriesArtwork>(artworks: T[], seriesFilter: string, search: string): T[] {
  const query = search.trim().toLowerCase();
  return artworks.filter((artwork) => {
    const series = artwork.series?.trim() || "";
    const matchesSeries = seriesFilter === "all" ||
      (seriesFilter === "other" ? !series : `series:${series}` === seriesFilter);
    return matchesSeries && artwork.title.toLowerCase().includes(query);
  });
}