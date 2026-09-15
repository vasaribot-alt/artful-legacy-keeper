import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, LifeBuoy, Minus, Mail } from "lucide-react";

interface Row {
  user_id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  id_verified: boolean;
  has_biography: boolean;
  has_avatar: boolean;
  roles: string[] | null;
  artworks: number;
  artworks_with_image: number;
  exhibitions: number;
  cv_entries: number;
  website_enabled: boolean;
  last_activity: string | null;
}

type Filter = "recent" | "stuck" | "all";

const STEPS: { key: keyof Row | "verified"; label: string; done: (r: Row) => boolean }[] = [
  { key: "verified", label: "Verified", done: (r) => r.id_verified },
  { key: "has_biography", label: "Biography", done: (r) => r.has_biography },
  { key: "artworks", label: "Works", done: (r) => r.artworks > 0 },
  { key: "artworks_with_image", label: "Photos", done: (r) => r.artworks_with_image > 0 },
  { key: "exhibitions", label: "Exhibitions", done: (r) => r.exhibitions > 0 },
  { key: "cv_entries", label: "CV", done: (r) => r.cv_entries > 0 },
];

const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

const progress = (r: Row) => STEPS.filter((s) => s.done(r)).length;

const needsHelp = (r: Row) => progress(r) <= 1 && daysSince(r.created_at) >= 1;

export default function OnboardingTracker() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("recent");

  useEffect(() => {
    supabase.rpc("get_onboarding_progress").then(({ data }) => {
      if (data) setRows(data as unknown as Row[]);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (filter === "recent") return rows.filter((r) => daysSince(r.created_at) <= 30);
    if (filter === "stuck") return rows.filter(needsHelp);
    return rows;
  }, [rows, filter]);

  const newThisWeek = rows.filter((r) => daysSince(r.created_at) <= 7).length;
  const stuckCount = rows.filter(needsHelp).length;

  if (loading) return <p className="text-sm text-muted-foreground">Loading onboarding status…</p>;

  return (
    <section>
      <div className="flex items-center gap-3 mb-1">
        <LifeBuoy className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Getting started</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {newThisWeek} joined in the last seven days. {stuckCount} have barely started and may need
        a hand.
      </p>

      <div className="flex items-center gap-2 mb-4">
        {([
          ["recent", "Last 30 days"],
          ["stuck", `Needs help (${stuckCount})`],
          ["all", `Everyone (${rows.length})`],
        ] as [Filter, string][]).map(([key, label]) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody in this group right now.</p>
      ) : (
        <div className="border border-border rounded-sm overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Progress</TableHead>
                {STEPS.map((s) => (
                  <TableHead key={s.label} className="text-center text-xs">{s.label}</TableHead>
                ))}
                <TableHead>Website</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const done = progress(r);
                return (
                  <TableRow key={r.user_id} className={needsHelp(r) ? "bg-secondary/40" : ""}>
                    <TableCell>
                      <span className="font-medium block">{r.full_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.email || "—"}
                        {r.country ? ` · ${r.country}` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {daysSince(r.created_at) === 0 ? "Today" : `${daysSince(r.created_at)} d ago`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="text-sm">{done}/{STEPS.length}</span>
                      {needsHelp(r) && (
                        <Badge variant="outline" className="ml-2 text-xs">Needs help</Badge>
                      )}
                    </TableCell>
                    {STEPS.map((s) => (
                      <TableCell key={s.label} className="text-center">
                        {s.done(r) ? (
                          <Check className="h-4 w-4 mx-auto" aria-label="Done" />
                        ) : (
                          <Minus className="h-4 w-4 mx-auto text-muted-foreground/40" aria-label="Not yet" />
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-sm text-muted-foreground">
                      {r.website_enabled ? "On" : "Off"}
                    </TableCell>
                    <TableCell>
                      {r.email && (
                        <Button variant="ghost" size="sm" asChild aria-label={`Email ${r.full_name || r.email}`}>
                          <a
                            href={`mailto:${r.email}?subject=${encodeURIComponent(
                              "Getting started in the Global Artist Registry",
                            )}&body=${encodeURIComponent(
                              `Dear ${r.full_name || "friend"},\n\nThank you for registering with the Global Artist Registry Foundation. I noticed you have not had the chance to set up your archive yet, and I would like to offer help.\n\nShort video walkthroughs are here: https://globalartistregistry.org/tutorials\n\nIf anything is unclear, simply reply to this message and we will guide you through it.\n\nWith kind regards,\nGlobal Artist Registry Foundation`,
                            )}`}
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
