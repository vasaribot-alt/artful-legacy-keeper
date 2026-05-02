import { supabase } from "@/integrations/supabase/client";

export interface StorageStatus {
  tier_slug: string;
  tier_name: string;
  quota_bytes: number;
  used_bytes: number;
  file_count: number;
}

export async function getStorageStatus(userId: string): Promise<StorageStatus | null> {
  const { data, error } = await supabase.rpc("get_user_storage_status", { _user_id: userId });
  if (error || !data || (data as StorageStatus[]).length === 0) return null;
  const row = (data as StorageStatus[])[0];
  return {
    ...row,
    quota_bytes: Number(row.quota_bytes),
    used_bytes: Number(row.used_bytes),
    file_count: Number(row.file_count),
  };
}

export class QuotaExceededError extends Error {
  constructor(public used: number, public quota: number, public attempted: number) {
    super("Storage quota exceeded");
    this.name = "QuotaExceededError";
  }
}

/** Throws QuotaExceededError if uploading `incomingBytes` would push usage past the user's quota. */
export async function assertWithinQuota(userId: string, incomingBytes: number): Promise<void> {
  const status = await getStorageStatus(userId);
  if (!status) return; // fail-open if RPC unavailable
  if (status.used_bytes + incomingBytes > status.quota_bytes) {
    throw new QuotaExceededError(status.used_bytes, status.quota_bytes, incomingBytes);
  }
}

export const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};
