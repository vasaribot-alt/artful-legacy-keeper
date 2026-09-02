import GarfLogo from "@/components/GarfLogo";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface PartnerOrg {
  slug: string;
  name: string;
  country: string | null;
  website: string | null;
  logo_url: string | null;
  intro_text: string | null;
}

const points = [
  {
    title: "Free lifetime registration",
    body: "Members register at no cost. There is no fee for artists, now or later.",
  },
  {
    title: "You own your archive",
    body: "Every artist can export and download their full archive at any time to keep a personal copy.",
  },
  {
    title: "Built to last 100 years",
    body: "The registry is run by a Dutch non-profit foundation (stichting) under a 100-Year Preservation Plan.",
  },
  {
    title: "No membership data required",
    body: "Your organisation shares a link. Member lists and personal data stay entirely with you.",
  },
];

const PartnerJoin = () => {
  const { slug = "" } = useParams();
  const [org, setOrg] = useState<PartnerOrg | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("get_partner_org_public", { _slug: slug });
      const row = Array.isArray(data) ? data[0] : data;
      setOrg((row as PartnerOrg) ?? null);
      setLoading(false);
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (org) {
      document.title = `${org.name} members join the Global Artist Registry`;
    }
  }, [org]);

  if (loading) return null;

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl mb-3">Partner link not found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This partner link is not active. You can still register directly.
          </p>
          <Button asChild>
            <Link to="/register">Create your archive</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <GarfLogo className="h-16" />
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
          A partnership with {org.name}
          {org.country ? ` · ${org.country}` : ""}
        </p>
        <h1 className="text-4xl font-serif leading-tight mb-5">
          {org.name} members: create your permanent archive
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mb-10">
          {org.intro_text ||
            `Members of ${org.name} are invited to document and preserve their work in the Global Artist Registry, an independent archive built to outlive galleries, markets and platforms.`}
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-16">
          <Button asChild size="lg">
            <Link to={`/register?org=${encodeURIComponent(org.slug)}`}>
              Register as an artist
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/invitation">Download the invitation (PDF)</Link>
          </Button>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 border-t border-border pt-12">
          {points.map((p) => (
            <div key={p.title}>
              <h2 className="text-base font-medium mb-2">{p.title}</h2>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border mt-12 pt-8 text-sm text-muted-foreground space-y-2">
          <p>
            Questions about governance and preservation?{" "}
            <Link to="/about" className="text-foreground underline">
              Read about the foundation
            </Link>{" "}
            or{" "}
            <Link to="/contact" className="text-foreground underline">
              book a call with us
            </Link>
            .
          </p>
          {org.website && (
            <p>
              Back to{" "}
              <a href={org.website} className="text-foreground underline" target="_blank" rel="noreferrer">
                {org.name}
              </a>
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default PartnerJoin;
