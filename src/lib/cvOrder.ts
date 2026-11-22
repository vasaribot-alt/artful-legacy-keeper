/** Latest four-digit year in a CV year field ("2005–2010" → 2010); null when none. */
export function cvYearValue(year: string | null | undefined): number | null {
  const matches = String(year ?? "").match(/\d{4}/g);
  if (!matches) return null;
  return Math.max(...matches.map(Number));
}

/** Newest first; entries without a year go last; ties keep their existing order. */
export function sortCvEntriesByYear<T extends { year?: string | null }>(entries: T[]): T[] {
  return entries
    .map((entry, index) => ({ entry, index, y: cvYearValue(entry.year) }))
    .sort((a, b) => {
      if (a.y === null && b.y === null) return a.index - b.index;
      if (a.y === null) return 1;
      if (b.y === null) return -1;
      return b.y - a.y || a.index - b.index;
    })
    .map((x) => x.entry);
}
