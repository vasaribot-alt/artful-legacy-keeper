import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive } from "lucide-react";

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

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const StorageUsageMeter = ({ userId }: { userId: string }) => {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_user_storage_usage", { _user_id: userId });
      if (!error && data) setRows(data as UsageRow[]);
      setLoading(false);
    })();
  }, [userId]);

  const total = rows.reduce((sum, r) => sum + Number(r.bytes || 0), 0);
  const totalFiles = rows.reduce((sum, r) => sum + Number(r.file_count || 0), 0);

  if (loading) {
    return <div className="h-20 bg-secondary animate-pulse rounded-sm" />;
  }

  return (
    <div className="border border-border rounded-sm p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <HardDrive className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Cloud storage</h3>
        <span className="ml-auto text-sm font-medium tabular-nums">{formatBytes(total)}</span>
      </div>
      <div className="text-xs text-muted-foreground mb-3">
        {totalFiles.toLocaleString()} {totalFiles === 1 ? "file" : "files"} stored
      </div>
      <div className="space-y-1.5">
        {rows
          .filter((r) => Number(r.bytes) > 0 || Number(r.file_count) > 0)
          .sort((a, b) => Number(b.bytes) - Number(a.bytes))
          .map((r) => {
            const pct = total > 0 ? (Number(r.bytes) / total) * 100 : 0;
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
