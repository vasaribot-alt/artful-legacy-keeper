import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StorageUsageMeter } from "@/components/StorageUsageMeter";
import { Check, HardDrive } from "lucide-react";
import { formatBytes, getStorageStatus, type StorageStatus } from "@/lib/storageQuota";

interface Tier {
  id: string;
  slug: string;
  name: string;
  quota_bytes: number;
  monthly_price_eur: number;
  description: string | null;
  display_order: number;
}

const TIER_FEATURES: Record<string, string[]> = {
  free: ["Get started with the registry", "Web-optimized previews included", "Best for early-career artists"],
  pro: ["Original archival files preserved", "TIFF & RAW server-side conversion", "Suited to active practices"],
  archive: ["Comprehensive multi-decade archive", "Priority server processing", "Estate-grade documentation"],
  estate: ["Full estate and legacy storage", "Unlimited series and exhibitions", "Long-term preservation guarantee"],
};

export default function StorageTiers() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setUserId(uid);

      const [tiersRes, st] = await Promise.all([
        supabase.from("storage_tiers").select("*").eq("is_active", true).order("display_order"),
        uid ? getStorageStatus(uid) : Promise.resolve(null),
      ]);
      if (tiersRes.data) setTiers(tiersRes.data as Tier[]);
      setStatus(st);
      setLoading(false);
    })();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-serif tracking-tight mb-2">Cloud Storage</h1>
          <p className="text-muted-foreground max-w-2xl">
            Your archive is preserved at full resolution. Originals are stored privately for archival integrity, while
            web-optimized previews keep the platform fast. Storage tiers are currently provisioned by the Foundation —
            paid subscriptions will activate once payments go live.
          </p>
        </header>

        {userId && (
          <section className="mb-10">
            <StorageUsageMeter userId={userId} />
          </section>
        )}

        <section>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-4">Available tiers</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-72 bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tiers.map((t) => {
                const isCurrent = status?.tier_slug === t.slug;
                return (
                  <div
                    key={t.id}
                    className={`border rounded-sm p-6 flex flex-col bg-card transition-colors ${
                      isCurrent ? "border-foreground" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium">{t.name}</h3>
                      {isCurrent && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 bg-foreground text-background rounded-sm uppercase tracking-wide">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{t.description}</p>
                    <div className="mb-1">
                      <span className="text-2xl font-serif">{formatBytes(Number(t.quota_bytes))}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-6">
                      {Number(t.monthly_price_eur) === 0
                        ? "Track only — pricing pending"
                        : `€${Number(t.monthly_price_eur).toFixed(2)} / month`}
                    </div>
                    <ul className="space-y-2 text-sm flex-1">
                      {(TIER_FEATURES[t.slug] || []).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground mt-10 max-w-2xl">
          Heavy formats such as TIFF and RAW are automatically converted to web-optimized JPEG previews server-side. The
          original archival file is always preserved.
        </p>
      </div>
    </AppLayout>
  );
}
