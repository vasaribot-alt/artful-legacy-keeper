import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LABELS: { key: string; label: string }[] = [
  { key: "cv_web", label: "CV on the website" },
  { key: "cv_pdf", label: "CV as a download" },
  { key: "exh_solo", label: "Solo exhibitions" },
  { key: "exh_group", label: "Group exhibitions" },
  { key: "exh_upcoming", label: "Upcoming exhibitions" },
  { key: "publications", label: "Publications" },
  { key: "news", label: "News" },
];

const WebsiteSectionsOverview = () => {
  const [total, setTotal] = useState(0);
  const [live, setLive] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("artist_websites").select("is_enabled, sections");
      const rows = data || [];
      setTotal(rows.length);
      setLive(rows.filter((r) => r.is_enabled).length);
      const tally: Record<string, number> = {};
      rows.forEach((row) => {
        const sections = (row.sections || {}) as Record<string, boolean>;
        LABELS.forEach(({ key }) => { if (sections[key]) tally[key] = (tally[key] || 0) + 1; });
      });
      setCounts(tally);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="rounded-lg border border-border p-6">
      <h2 className="font-serif text-xl">Artist websites</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        What artists choose to include, so we can see what they actually want.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <p className="mt-4 text-sm">{total} website{total === 1 ? "" : "s"} created, {live} online.</p>
          <ul className="mt-5 divide-y divide-border border-t border-border text-sm">
            {LABELS.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between py-3">
                <span>{label}</span>
                <span className="text-muted-foreground">{counts[key] || 0}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

export default WebsiteSectionsOverview;
