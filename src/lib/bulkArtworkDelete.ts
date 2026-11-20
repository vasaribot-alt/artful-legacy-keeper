import { supabase } from "@/integrations/supabase/client";

// Keep UUID filters well below the gateway's URL-size limit.
const DELETE_BATCH_SIZE = 50;

export async function deleteSelectedArtworks(
  ids: string[],
  ownerId: string,
  roleContext: "artist" | "collector",
  onProgress?: (deleted: number) => void,
): Promise<{ deletedIds: string[]; error: string | null }> {
  const deletedIds: string[] = [];
  if (ids.length === 0) return { deletedIds, error: null };
  try {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || data.user?.id !== ownerId) {
      return { deletedIds, error: "Please sign in again before deleting artworks." };
    }
    const uniqueIds = [...new Set(ids)];
    for (let offset = 0; offset < uniqueIds.length; offset += DELETE_BATCH_SIZE) {
      const batch = uniqueIds.slice(offset, offset + DELETE_BATCH_SIZE);
      const { data: rows, error } = await supabase
        .from("artworks")
        .delete()
        .eq("owner_id", ownerId)
        .eq("role_context", roleContext)
        .in("id", batch)
        .select("id");
      if (error) return { deletedIds, error: error.message };
      const returnedIds = (rows ?? []).map(row => row.id);
      deletedIds.push(...returnedIds);
      onProgress?.(deletedIds.length);
      if (returnedIds.length !== batch.length) {
        return { deletedIds, error: "Some selected artworks could not be deleted. Please check your access and try again." };
      }
    }
    return { deletedIds, error: null };
  } catch (error) {
    return { deletedIds, error: error instanceof Error ? error.message : "The connection was interrupted. Please try again." };
  }
}