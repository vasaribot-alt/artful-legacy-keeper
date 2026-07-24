import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { TrendingUp, Users, Gift, Sparkles, ArrowRight } from "lucide-react";

interface Application {
  id: string;
  contact_name: string;
  organization_name: string | null;
  tier: "bronze" | "silver" | "gold" | "platinum";
  status: "new" | "contacted" | "pledged" | "gifted" | "declined";
  pledge_amount_eur: number | null;
  created_at: string;
}

interface Donation {
  id: string;
  donor_name: string | null;
  email: string | null;
  amount_cents: number;
  currency: string;
  kind: string;
  status: string;
  created_at: string;
}

interface MajorGift {
  id: string;
  full_name: string;
  organisation: string | null;
  estimated_amount_eur: number | null;
  status: string;
  created_at: string;
}

const eur = (n: number) =>
  new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const TIER_TARGETS: Record<string, number> = {
  platinum: 100000,
  gold: 50000,
  silver: 25000,
  bronze: 10000,
};

const TIER_COLORS: Record<string, string> = {
  platinum: "bg-slate-800 text-white",
  gold: "bg-amber-100 text-amber-900",
  silver: "bg-zinc-200 text-zinc-800",
  bronze: "bg-orange-100 text-orange-900",
};

export default function FundraisingDashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [gifts, setGifts] = useState<MajorGift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, d, g] = await Promise.all([
        supabase.from("founding_supporter_applications").select("*").order("created_at", { ascending: false }),
        supabase.from("donations").select("*").order("created_at", { ascending: false }),
        supabase.from("major_gift_inquiries").select("*").order("created_at", { ascending: false }),
      ]);
      if (a.data) setApps(a.data as any);
      if (d.data) setDonations(d.data as any);
      if (g.data) setGifts(g.data as any);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const paidDonations = donations.filter((d) => d.status === "succeeded" || d.status === "paid");
    const donationTotal = paidDonations.reduce((s, d) => s + (d.amount_cents || 0), 0) / 100;

    const pledgedApps = apps.filter((a) => a.status === "pledged" || a.status === "gifted");
    const pledgedTotal = pledgedApps.reduce(
      (s, a) => s + (a.pledge_amount_eur ?? TIER_TARGETS[a.tier] ?? 0),
      0,
    );
    const giftedTotal = apps
      .filter((a) => a.status === "gifted")
      .reduce((s, a) => s + (a.pledge_amount_eur ?? TIER_TARGETS[a.tier] ?? 0), 0);

    const inquiryPipeline = gifts
      .filter((g) => g.status !== "declined" && g.status !== "closed_lost")
      .reduce((s, g) => s + (g.estimated_amount_eur ?? 0), 0);

    const totalRaised = donationTotal + giftedTotal;
    const totalPipeline = pledgedTotal - giftedTotal + inquiryPipeline;

    return {
      donationTotal,
      donationCount: paidDonations.length,
      pledgedTotal,
      giftedTotal,
      inquiryPipeline,
      totalRaised,
      totalPipeline,
      newApps: apps.filter((a) => a.status === "new").length,
      newGifts: gifts.filter((g) => g.status === "new").length,
    };
  }, [apps, donations, gifts]);

  const goal = 1_000_000;
  const progress = Math.min(100, (stats.totalRaised / goal) * 100);
  const pipelineProgress = Math.min(100, ((stats.totalRaised + stats.totalPipeline) / goal) * 100);

  const tierBreakdown = useMemo(() => {
    const tiers: Array<"platinum" | "gold" | "silver" | "bronze"> = ["platinum", "gold", "silver", "bronze"];
    return tiers.map((t) => ({
      tier: t,
      count: apps.filter((a) => a.tier === t).length,
      pledged: apps.filter((a) => a.tier === t && (a.status === "pledged" || a.status === "gifted")).length,
    }));
  }, [apps]);

  const recentActivity = useMemo(() => {
    type Item = { id: string; when: string; label: string; sub: string; amount: number | null; badge: string };
    const items: Item[] = [];
    apps.slice(0, 20).forEach((a) =>
      items.push({
        id: `a-${a.id}`,
        when: a.created_at,
        label: a.organization_name || a.contact_name,
        sub: `Founding Supporter · ${a.tier}`,
        amount: a.pledge_amount_eur ?? TIER_TARGETS[a.tier] ?? null,
        badge: a.status,
      }),
    );
    donations.slice(0, 20).forEach((d) =>
      items.push({
        id: `d-${d.id}`,
        when: d.created_at,
        label: d.donor_name || d.email || "Anonymous",
        sub: `Donation · ${d.kind}`,
        amount: d.amount_cents / 100,
        badge: d.status,
      }),
    );
    gifts.slice(0, 20).forEach((g) =>
      items.push({
        id: `g-${g.id}`,
        when: g.created_at,
        label: g.organisation || g.full_name,
        sub: "Major gift inquiry",
        amount: g.estimated_amount_eur,
        badge: g.status,
      }),
    );
    return items.sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 12);
  }, [apps, donations, gifts]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif">Fundraising</h1>
            <p className="text-muted-foreground mt-1">
              Live overview of donations, founding supporters, and major gift pipeline.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/foundation/founding-supporters">Founding Supporters <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        {/* Progress to €1M */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-baseline justify-between">
              <CardTitle className="text-lg">Progress to €1,000,000 goal</CardTitle>
              <span className="text-sm text-muted-foreground">
                {eur(stats.totalRaised)} raised · {eur(stats.totalPipeline)} in pipeline
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-muted-foreground/30"
                style={{ width: `${pipelineProgress}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-emerald-600"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{progress.toFixed(1)}% secured</span>
              <span>{pipelineProgress.toFixed(1)}% incl. pipeline</span>
            </div>
          </CardContent>
        </Card>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Total raised"
            value={eur(stats.totalRaised)}
            hint={`${stats.donationCount} donations + gifted supporters`}
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Founding Supporter pledges"
            value={eur(stats.pledgedTotal)}
            hint={`${apps.filter((a) => a.status === "pledged" || a.status === "gifted").length} pledged / ${apps.length} applications`}
          />
          <StatCard
            icon={<Gift className="h-4 w-4" />}
            label="Major gift pipeline"
            value={eur(stats.inquiryPipeline)}
            hint={`${gifts.length} inquiries · ${stats.newGifts} new`}
          />
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Public donations"
            value={eur(stats.donationTotal)}
            hint={`${stats.donationCount} completed transactions`}
          />
        </div>

        {/* Tier breakdown + Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-lg">Supporter tiers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tierBreakdown.map((row) => (
                <div key={row.tier} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`capitalize ${TIER_COLORS[row.tier]}`}>{row.tier}</Badge>
                    <span className="text-sm text-muted-foreground">{eur(TIER_TARGETS[row.tier])}+</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{row.pledged}</span>
                    <span className="text-muted-foreground"> / {row.count}</span>
                  </div>
                </div>
              ))}
              {tierBreakdown.every((r) => r.count === 0) && (
                <p className="text-sm text-muted-foreground">No applications yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="divide-y">
                  {recentActivity.map((item) => (
                    <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sub} · {format(new Date(item.when), "d MMM yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {item.amount != null && (
                          <span className="text-sm font-medium">{eur(item.amount)}</span>
                        )}
                        <Badge variant="outline" className="capitalize">{item.badge}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          {icon}
          <span>{label}</span>
        </div>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
