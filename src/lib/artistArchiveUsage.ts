export interface ArtistArchiveUsage {
  user_id: string;
  sketchbook_count: number;
  archival_document_count: number;
}

export function attachArtistArchiveUsage<T extends { user_id: string }>(rows: T[], usage: ArtistArchiveUsage[]) {
  const byUser = new Map(usage.map((entry) => [entry.user_id, entry]));
  return rows.map((row) => ({
    ...row,
    sketchbook_count: byUser.get(row.user_id)?.sketchbook_count ?? 0,
    archival_document_count: byUser.get(row.user_id)?.archival_document_count ?? 0,
  }));
}