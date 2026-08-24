import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Stats {
  name: string;
  country: string | null;
  logo_url: string | null;
  members_joined: number;
  members_id_verified: number;
  artworks_archived: number;
  exhibitions_recorded: number;
  first_join_at: string | null;
  last_join_at: string | null;
}

const PartnerDashboard = () => {
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [key, setKey] = useState(searchParams.get("key") || "");
  const [stats, setStats] = useState<Stats | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async (accessKey: string) => {
    if (!accessKey) return;
    setLoading(true);
    const { data } = await supabase.rpc("get_partner_org_stats", { _slug: slug, _key: accessKey });
    const row = Array.isArray(data) ? data[0] : data;
    setStats((row as Stats) ?? null);
    setChecked(true);
    setLoading(false);
  };

  useEffect(() => {
    const fromUrl = searchParams.get("key");
    if (fromUrl) load(fromUrl);
    else setChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const metrics = stats
    ? [
        { label: "Members registered", value: stats.members_joined },
        { label: "Identity verified", value: stats.members_id_verified },
        { label: "Artworks archived", value: stats.artworks_archived },
        { label: "Exhibitions recorded", value: stats.exhibitions_recorded },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Global Artist Registry Foundation
          </Link>
          <span className="text-xs text-muted-foreground">Partner dashboard</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        {!stats && (
          <div className="max-w-sm">
            <h1 className="text-2xl mb-2">Partner dashboard</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Enter the access key we sent to your board to see your organisation's aggregate figures.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                load(key.trim());
              }}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="key">Access key</Label>
                <Input
                  id="key"
                  value={key}
                  autoComplete="off"
                  onChange={(e) => setKey(e.target.value)}
                  className="mt-1.5 font-mono"
                />
              </div>
              <Button type="submit" disabled={loading || !key.trim()}>
                {loading ? "Checking..." : "Open dashboard"}
              </Button>
            </form>
            {checked && !loading && key && (
              <p className="text-sm text-destructive mt-4">
                That key is not valid for this organisation.
              </p>
            )}
          </div>
        )}

        {stats && (
          <>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              {stats.country || "Partner organisation"}
            </p>
            <h1 className="text-3xl font-serif mb-2">{stats.name}</h1>
            <p className="text-sm text-muted-foreground mb-10">
              Aggregate figures only. No member names, emails or artworks are shown here, and none are
              shared with the foundation beyond what each artist registers themselves.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border rounded-sm overflow-hidden">
              {metrics.map((m) => (
                <div key={m.label} className="bg-background p-5">
                  <div className="text-3xl font-serif">{m.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                </div>
              ))}
            </div>

            <dl className="mt-10 text-sm space-y-2">
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-40">First member joined</dt>
                <dd>{stats.first_join_at ? new Date(stats.first_join_at).toLocaleDateString() : "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-40">Most recent join</dt>
                <dd>{stats.last_join_at ? new Date(stats.last_join_at).toLocaleDateString() : "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-40">Member join link</dt>
                <dd>
                  <code className="font-mono text-xs">
                    {window.location.origin}/join/{slug}
                  </code>
                </dd>
              </div>
            </dl>

            <p className="text-sm text-muted-foreground border-t border-border mt-10 pt-6">
              Need a figure that is not here?{" "}
              <Link to="/contact" className="text-foreground underline">
                Tell us
              </Link>{" "}
              and we will add it.
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default PartnerDashboard;
