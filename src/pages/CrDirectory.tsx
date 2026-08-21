import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Row {
  user_id: string;
  global_artist_id: number;
  full_name: string | null;
  birth_year: number | null;
  birth_country: string | null;
  death_year: number | null;
  death_country: string | null;
  nationality: string | null;
  cr_status: string | null;
}

const BUCKETS = [
  { label: "A–E", test: (c: string) => c >= "A" && c <= "E" },
  { label: "F–K", test: (c: string) => c >= "F" && c <= "K" },
  { label: "L–Q", test: (c: string) => c >= "L" && c <= "Q" },
  { label: "R–Z", test: (c: string) => c >= "R" && c <= "Z" },
];

export default function CrDirectory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "user_id, global_artist_id, full_name, birth_year, birth_country, death_year, death_country, nationality, cr_status"
        )
        .eq("cr_listed", true)
        .order("full_name", { ascending: true });
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const name = (r.full_name || "").trim();
      if (q && !name.toLowerCase().includes(q.toLowerCase())) return false;
      if (bucket) {
        const initial = (name[0] || "").toUpperCase();
        const b = BUCKETS.find((x) => x.label === bucket);
        if (b && !b.test(initial)) return false;
      }
      if (status !== "all" && r.cr_status !== status) return false;
      return true;
    });
  }, [rows, q, bucket, status]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                The Raisonné
              </p>
              <h1 className="font-serif text-4xl md:text-5xl mt-2">
                Catalogues Raisonnés
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl">
                A scholarly directory of artists whose catalogues raisonnés are
                published, in preparation, or available online.
              </p>
            </div>
            <Link to="/cr/profile" className="shrink-0">
              <Button variant="outline" size="sm">
                Set up CR profile
              </Button>
            </Link>
          </div>

          <div className="mt-8 border-t pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                Are you a scholar or compiler of a catalogue raisonné?
              </p>
              <p className="text-sm text-muted-foreground">
                List your project in the directory, published, in preparation,
                or online.
              </p>
            </div>
            <Link to="/cr/profile">
              <Button size="sm">List your catalogue raisonné</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Input
            placeholder="Search by artist name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="md:max-w-sm"
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={bucket === null ? "default" : "outline"}
              size="sm"
              onClick={() => setBucket(null)}
            >
              All
            </Button>
            {BUCKETS.map((b) => (
              <Button
                key={b.label}
                size="sm"
                variant={bucket === b.label ? "default" : "outline"}
                onClick={() => setBucket(b.label)}
              >
                {b.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 md:ml-auto">
            {[
              ["all", "All"],
              ["published", "Published"],
              ["in_preparation", "In Preparation"],
              ["digital_only", "Online"],
            ].map(([v, l]) => (
              <Button
                key={v}
                size="sm"
                variant={status === v ? "default" : "outline"}
                onClick={() => setStatus(v)}
              >
                {l}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No artists match.</p>
        ) : (
          <ul className="divide-y border rounded-md">
            {filtered.map((r) => (
              <li key={r.user_id}>
                <Link
                  to={`/cr/artist/${r.global_artist_id}`}
                  className="flex items-baseline justify-between gap-4 px-4 py-4 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <div className="font-serif text-lg">
                      {r.full_name || "Untitled"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {[
                        r.birth_year && `b. ${r.birth_year}${r.birth_country ? `, ${r.birth_country}` : ""}`,
                        r.death_year && `d. ${r.death_year}${r.death_country ? `, ${r.death_country}` : ""}`,
                        r.nationality,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">
                    {r.cr_status === "published"
                      ? "Published"
                      : r.cr_status === "digital_only"
                      ? "Online"
                      : "In Preparation"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
