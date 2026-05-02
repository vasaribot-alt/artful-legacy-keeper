import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StorageUsageMeter } from "@/components/StorageUsageMeter";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Check, HardDrive, ExternalLink, Loader2 } from "lucide-react";
import { formatBytes, getStorageStatus, type StorageStatus } from "@/lib/storageQuota";

interface Tier {
  id: string;
  slug: string;
  name: string;
  quota_bytes: number;
  monthly_price_eur: number;
  description: string | null;
  display_order: number;
  stripe_price_id: string | null;
}

interface Subscription {
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  tier_id: string;
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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast({ title: "Subscription activated", description: "Your new tier is being applied." });
      searchParams.delete("checkout"); searchParams.delete("tier");
      setSearchParams(searchParams, { replace: true });
    } else if (checkout === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No changes made to your subscription." });
      searchParams.delete("checkout");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const reload = async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);

    const [tiersRes, st, subRes] = await Promise.all([
      supabase.from("storage_tiers").select("*").eq("is_active", true).order("display_order"),
      uid ? getStorageStatus(uid) : Promise.resolve(null),
      uid
        ? supabase
            .from("tier_subscriptions")
            .select("status, cancel_at_period_end, current_period_end, tier_id")
            .eq("user_id", uid)
            .maybeSingle()
        : Promise.resolve({ data: null } as never),
    ]);
    if (tiersRes.data) setTiers(tiersRes.data as Tier[]);
    setStatus(st);
    setSubscription((subRes as any).data ?? null);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const handleUpgrade = async (tier: Tier) => {
    setPendingSlug(tier.slug);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tier_slug: tier.slug },
      });
      if (error) throw error;
      if (data?.error === "payments_not_active") {
        toast({
          title: "Payments not yet active",
          description: "Stripe activation is pending the Foundation's bank account setup. Available soon.",
        });
        return;
      }
      if (data?.error === "tier_not_configured") {
        toast({
          title: "Tier not yet linked to Stripe",
          description: data.message ?? "Stripe price ID is missing for this tier.",
          variant: "destructive",
        });
        return;
      }
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setPendingSlug(null);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.error === "payments_not_active") {
        toast({ title: "Payments not yet active", description: "Activation pending bank setup." });
        return;
      }
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Could not open billing portal", description: e?.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const hasActiveSub = subscription && ["active", "trialing", "past_due"].includes(subscription.status);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-10 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-serif tracking-tight mb-2">Cloud Storage</h1>
            <p className="text-muted-foreground max-w-2xl">
              Your archive is preserved at full resolution. Originals are stored privately for archival integrity, while
              web-optimized previews keep the platform fast.
            </p>
          </div>
          {hasActiveSub && (
            <Button variant="outline" size="sm" onClick={handleManage} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              Manage subscription
            </Button>
          )}
        </header>

        {userId && (
          <section className="mb-10">
            <StorageUsageMeter userId={userId} />
          </section>
        )}

        {subscription && (
          <div className="mb-6 text-xs text-muted-foreground border border-border rounded-sm p-3 bg-secondary/30">
            Subscription status: <span className="font-medium text-foreground">{subscription.status}</span>
            {subscription.current_period_end && (
              <> · Renews {new Date(subscription.current_period_end).toLocaleDateString()}</>
            )}
            {subscription.cancel_at_period_end && <> · Cancels at period end</>}
          </div>
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
                const isFree = t.slug === "free";
                const isPending = pendingSlug === t.slug;
                const stripeReady = !!t.stripe_price_id;
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
                      {isFree
                        ? "Included"
                        : `€${Number(t.monthly_price_eur).toFixed(2)} / month`}
                    </div>
                    <ul className="space-y-2 text-sm flex-1 mb-6">
                      {(TIER_FEATURES[t.slug] || []).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {!isFree && !isCurrent && (
                      <Button
                        variant={stripeReady ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => handleUpgrade(t)}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : stripeReady ? (
                          "Upgrade"
                        ) : (
                          "Coming soon"
                        )}
                      </Button>
                    )}
                    {isCurrent && !isFree && (
                      <div className="text-xs text-center text-muted-foreground">Active plan</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground mt-10 max-w-2xl">
          Heavy formats such as TIFF and RAW are automatically converted to web-optimized JPEG previews server-side. The
          original archival file is always preserved. Paid subscriptions activate once Stripe is connected.
        </p>
      </div>
    </AppLayout>
  );
}
