import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Donor {
  id: string;
  full_name: string;
  tier: string;
  message: string | null;
}

const tierLabels: Record<string, { label: string; description: string }> = {
  platinum: {
    label: "Platinum",
    description: "Visionary supporters who make the foundation's core mission possible.",
  },
  gold: {
    label: "Gold",
    description: "Major contributors driving key initiatives and programs.",
  },
  silver: {
    label: "Silver",
    description: "Valued supporters advancing art preservation and documentation.",
  },
  bronze: {
    label: "Bronze",
    description: "Friends of the foundation who believe in the mission.",
  },
};

const tierOrder = ["platinum", "gold", "silver", "bronze"];

const Donors = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonors = async () => {
      const { data } = await supabase
        .from("donors")
        .select("id, full_name, tier, message")
        .eq("is_public", true)
        .order("created_at", { ascending: true });

      if (data) setDonors(data);
      setLoading(false);
    };
    fetchDonors();
  }, []);

  const groupedByTier = tierOrder
    .map((tier) => ({
      tier,
      ...tierLabels[tier],
      donors: donors.filter((d) => d.tier === tier),
    }))
    .filter((g) => g.donors.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Global Artist Registry Foundation
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Our Supporters</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-6 text-balance">
            The people preserving art for generations
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Our donors make it possible to build a permanent, artist-controlled archive that will outlast 
            any single institution. Their generosity ensures that every artist's legacy is documented, 
            authenticated, and preserved, not for years, but for centuries.
          </p>
        </div>
      </section>

      {/* Why support us */}
      <section className="py-16 px-6 border-b border-border bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-8 text-center">Why your support matters</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Preserve art history",
                text: "Every contribution helps build infrastructure that protects and documents artistic legacies for 100+ years.",
              },
              {
                title: "Empower artists",
                text: "Funding ensures artists, not markets or institutions, control the definitive record of their life's work.",
              },
              {
                title: "Build something permanent",
                text: "Unlike galleries that close or databases that disappear, this archive is designed to endure across generations.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donor directory */}
      <main className="max-w-5xl mx-auto px-6 py-16">
        {loading ? (
          <div className="text-muted-foreground text-center py-12">Loading...</div>
        ) : donors.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            Our supporter program is launching soon.
          </p>
        ) : (
          <div className="space-y-16">
            {groupedByTier.map((group) => (
              <section key={group.tier}>
                <h2 className="text-xl font-medium mb-1">{group.label}</h2>
                <p className="text-sm text-muted-foreground mb-8">{group.description}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {group.donors.map((donor) => (
                    <div key={donor.id} className="text-center">
                      <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-lg font-medium text-secondary-foreground">
                          {donor.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{donor.full_name}</p>
                      {donor.message && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{donor.message}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-border text-center">
        <h2 className="text-2xl font-semibold mb-3">Become a Supporter</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
          Interested in supporting the preservation of art history?
          Donate to the foundation and join the community of people helping to safeguard artistic legacies for the next hundred years.
        </p>
        <Button asChild size="lg">
          <Link to="/donate">Support the foundation</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 Global Artist Registry Foundation</span>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Donors;
