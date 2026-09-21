import { supabase } from "@/integrations/supabase/client";

/**
 * Images the public is allowed to see for a work.
 * For a protected work this is only the small watermarked version; the full
 * file never leaves the archive, so its path is never returned here.
 */
export interface PublicArtworkImage {
  id: string;
  artwork_id: string;
  display_order: number | null;
  protected: boolean;
  bucket: string;
  path: string | null;
  width: number | null;
  height: number | null;
}

export async function fetchPublicArtworkImages(artworkIds: string[]): Promise<PublicArtworkImage[]> {
  if (!artworkIds.length) return [];
  const { data, error } = await supabase.rpc("get_public_artwork_images", {
    _artwork_ids: artworkIds,
  });
  if (error) {
    console.error("get_public_artwork_images failed", error);
    return [];
  }
  return (data || []) as PublicArtworkImage[];
}

/** Public URL for one allowed image. Protected works are streamed, never linked from storage. */
export function publicArtworkImageUrl(img: PublicArtworkImage): string | null {
  if (img.protected) {
    const base = import.meta.env.VITE_SUPABASE_URL;
    return `${base}/functions/v1/protected-artwork-image?image_id=${img.id}`;
  }
  if (!img.path) return null;
  return supabase.storage.from(img.bucket).getPublicUrl(img.path).data.publicUrl;
}

/** Group allowed images per work, in display order. */
export function groupPublicArtworkImages(rows: PublicArtworkImage[]) {
  const map = new Map<string, PublicArtworkImage[]>();
  for (const row of rows) {
    if (!map.has(row.artwork_id)) map.set(row.artwork_id, []);
    map.get(row.artwork_id)!.push(row);
  }
  return map;
}

/** Note shown beside a protected work so nobody is misled about what is on display. */
export const PROTECTED_WORK_NOTE = "Protected work — full image held in the archive";
