import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive, AlertTriangle } from "lucide-react";
import { getStorageStatus, formatBytes, type StorageStatus } from "@/lib/storageQuota";
import { Link } from "react-router-dom";

interface UsageRow {
  source: string;
  bytes: number;
  file_count: number;
}

const SOURCE_LABEL: Record<string, string> = {
  "artwork-image": "Artwork images",
  "artwork-document": "Artwork documents",
  "exhibition-image": "Exhibition images",
  "exhibition-document": "Exhibition documents",
  "catalogue-cover": "Catalogue covers",
  "cv-image": "CV images",
};

export const StorageUsageMeter = ({ userId }: { userId: string }) => {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [usageRes, statusRes] = await Promise.all([
        supabase.rpc("get_user_storage_usage", { _user_id: userId }),
        getStorageStatus(userId),
      ]);
      if (!usageRes.error && usageRes.data) setRows(usageRes.data as UsageRow[]);
      setStatus(statusRes);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="h-32 bg-secondary animate-pulse rounded-sm" />;

  const used = status?.used_bytes ?? rows.reduce((s, r) => s + Number(r.bytes || 0), 0);
  const quota = status?.quota_bytes ?? 0;
  const totalFiles = rows.reduce((s, r) => s + Number(r.file_count || 0), 0);
  const pctUsed = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const overQuota = quota > 0 && used > quota;
  const nearQuota = pctUsed >= 80;

  return (
    <div className="border border-border rounded-sm p-4 bg-card">
      <div className="flex items-center gap-2 mb-1">
        <HardDrive className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Cloud storage</h3>
        {status && (
          <span className="text-xs px-2 py-0.5 bg-secondary rounded-sm uppercase tracking-wide">
            {status.tier_name}
          </span>
        )}
        <span className="ml-auto text-sm font-medium tabular-nums">
          {formatBytes(used)} {quota > 0 && <span className="text-muted-foreground">/ {formatBytes(quota)}</span>}
        </span>
      </div>

      {quota > 0 && (
        <div className="mb-3 mt-2">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${overQuota ? "bg-destructive" : nearQuota ? "bg-amber-500" : "bg-foreground/70"}`}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
          {(overQuota || nearQuota) && (
            <div className={`flex items-center gap-1.5 mt-2 text-xs ${overQuota ? "text-destructive" : "text-amber-700 dark:text-amber-500"}`}>
              <AlertTriangle className="w-3 h-3" />
              <span>
                {overQuota ? "Over quota — uploads blocked." : "Approaching quota."}{" "}
                <Link to="/storage-tiers" className="underline">View tiers</Link>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground mb-3">
        {totalFiles.toLocaleString()} {totalFiles === 1 ? "file" : "files"} stored
      </div>

      <div className="space-y-1.5">
        {rows
          .filter((r) => Number(r.bytes) > 0 || Number(r.file_count) > 0)
          .sort((a, b) => Number(b.bytes) - Number(a.bytes))
          .map((r) => {
            const pct = used > 0 ? (Number(r.bytes) / used) * 100 : 0;
            return (
              <div key={r.source}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground">{SOURCE_LABEL[r.source] || r.source}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatBytes(Number(r.bytes))} · {r.file_count}
                  </span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-foreground/70 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
