import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, Check, X, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Kind = "profile_field" | "cv_entry" | "artwork" | "image";

interface Finding {
  id: string;
  run_id: string;
  kind: string;
  field: string | null;
  label: string;
  value: string | null;
  payload: Record<string, unknown>;
  source_url: string | null;
  confidence: string | null;
  status: string;
}

interface Run {
  id: string;
  status: string;
  artist_name: string | null;
  seed_urls: string[];
  sources: unknown;
  created_at: string;
  error: string | null;
}

const CV_SECTION_MAP: Record<string, string> = {
  solo_exhibitions: "SELECTED SOLO EXHIBITIONS AND PROJECTS",
  group_exhibitions: "SELECTED GROUP EXHIBITIONS AND PROJECTS",
  awards: "GRANTS",
  grants: "GRANTS",
  collections: "PUBLIC COLLECTIONS",
  education: "EDUCATION",
  publications: "PUBLICATIONS",
  residencies: "RESIDENCIES",
  bibliography: "SELECTED BIBLIOGRAPHY",
};

const KIND_LABELS: Record<Kind, string> = {
  profile_field: "Profile",
  cv_entry: "CV",
  artwork: "Artworks",
  image: "Images",
};

const detectPlatform = (url: string): string => {
  const u = url.toLowerCase();
  if (u.includes("instagram")) return "instagram";
  if (u.includes("facebook")) return "facebook";
  if (u.includes("linkedin")) return "linkedin";
  if (u.includes("youtube")) return "youtube";
  if (u.includes("vimeo")) return "vimeo";
  if (u.includes("twitter") || u.includes("x.com")) return "x";
  return "website";
};

interface Props {
  ownerId: string;
  /** true when the current user is a registrar working on a client account */
  asRegistrar?: boolean;
}

export function ResearchWorkspace({ ownerId, asRegistrar = false }: Props) {
  const [urls, setUrls] = useState("");
  const [hints, setHints] = useState("");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);
  const [activeRun, setActiveRun] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: runRows } = await supabase
      .from("research_runs")
      .select("id, status, artist_name, seed_urls, sources, created_at, error")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(20);
    const list = (runRows || []) as Run[];
    setRuns(list);
    const current = activeRun && list.some((r) => r.id === activeRun) ? activeRun : list[0]?.id ?? null;
    setActiveRun(current);
    if (current) {
      const { data } = await supabase
        .from("research_findings")
        .select("id, run_id, kind, field, label, value, payload, source_url, confidence, status")
        .eq("run_id", current)
        .order("created_at");
      setFindings((data || []) as unknown as Finding[]);
    } else {
      setFindings([]);
    }
    setLoading(false);
  }, [ownerId, activeRun]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, activeRun]);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("research-artist", {
        body: {
          owner_id: ownerId,
          urls: urls.split(/\s+/).map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u)),
          hints: hints.trim() || undefined,
        },
      });
      if (error) {
        // surface the function's own message instead of a generic failure
        let message = error.message || "Research failed, please try again";
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const body = await ctx.text();
            const parsed = JSON.parse(body);
            if (parsed?.error) message = String(parsed.error);
            else if (body) message = body.slice(0, 300);
          } catch {
            /* keep the default message */
          }
        }
        toast.error(message);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(
        `${data.count} findings from ${data.pages_read ?? 0} page${data.pages_read === 1 ? "" : "s"}` +
          (data.images_kept != null ? `, ${data.images_kept} images kept` : "") +
          (data.images_skipped ? `, ${data.images_skipped} unrelated images filtered out` : "") +
          (data.pages_failed ? ` (${data.pages_failed} could not be read)` : ""),
      );
      setActiveRun(data.run_id);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Research failed, please try again");
    } finally {
      setRunning(false);
    }
  };


  const mark = async (id: string, status: string) => {
    const { error } = await supabase
      .from("research_findings")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Could not update the finding");
      return false;
    }
    setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    return true;
  };

  const accept = async (f: Finding) => {
    setBusy(f.id);
    try {
      if (f.kind === "profile_field") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, galleries, social_media_links")
          .eq("user_id", ownerId)
          .maybeSingle();
        if (!profile) throw new Error("Profile not found");

        const update: Record<string, unknown> = {};
        if (f.field === "galleries") {
          const existing = Array.isArray(profile.galleries) ? (profile.galleries as { name?: string }[]) : [];
          const known = new Set(existing.map((g) => (g.name || "").trim().toLowerCase()));
          const additions = ((f.payload.galleries as string[]) || [])
            .filter((n) => n && !known.has(n.trim().toLowerCase()))
            .map((n) => ({ name: n, phone: "", website: "" }));
          update.galleries = [...existing, ...additions];
        } else if (f.field === "social_links") {
          const existing = Array.isArray(profile.social_media_links)
            ? (profile.social_media_links as { url?: string }[])
            : [];
          const known = new Set(existing.map((l) => (l.url || "").trim().toLowerCase()));
          const additions = Object.values((f.payload.social_links as Record<string, string>) || {})
            .filter((url) => url && !known.has(url.trim().toLowerCase()))
            .map((url) => ({ platform: detectPlatform(url), url }));
          update.social_media_links = [...existing, ...additions];
        } else if (f.field === "birth_year") {
          const y = parseInt(String(f.value || ""), 10);
          if (!Number.isFinite(y)) throw new Error("Invalid year");
          update.birth_year = y;
        } else if (f.field) {
          update[f.field] = f.value;
        }
        const { error } = await supabase
          .from("profiles")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(update as any)
          .eq("user_id", ownerId);

        if (error) throw error;
        toast.success("Added to the profile");
      } else if (f.kind === "cv_entry") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", ownerId)
          .maybeSingle();
        if (!profile) throw new Error("Profile not found");
        const section = CV_SECTION_MAP[f.field || ""] || (f.field || "OTHER").replace(/_/g, " ").toUpperCase();
        const { data: last } = await supabase
          .from("cv_entries")
          .select("display_order")
          .eq("profile_id", profile.id)
          .order("display_order", { ascending: false })
          .limit(1);
        const order = (last?.[0]?.display_order ?? 0) + 1;
        const { error } = await supabase.from("cv_entries").insert({
          profile_id: profile.id,
          section,
          entry_text: String(f.payload.text || f.value || f.label),
          year: (f.payload.year as string) || null,
          display_order: order,
        });
        if (error) throw error;
        toast.success(`Added to CV: ${section}`);
      } else if (f.kind === "artwork") {
        const p = f.payload as Record<string, unknown>;
        const { data: created, error } = await supabase
          .from("artworks")
          .insert({
            owner_id: ownerId,
            role_context: "artist",
            title: String(p.title || f.label),
            year: typeof p.year === "number" ? p.year : null,
            medium: (p.medium as string) || null,
            height: typeof p.height_cm === "number" ? p.height_cm : null,
            width: typeof p.width_cm === "number" ? p.width_cm : null,
            depth: typeof p.depth_cm === "number" ? p.depth_cm : null,
            description: (p.description as string) || null,
          })
          .select("id")
          .single();
        if (error) throw error;

        const imageUrls = [
          ...(typeof p.image_url === "string" ? [p.image_url] : []),
          ...(Array.isArray(p.image_urls) ? (p.image_urls as unknown[]).filter((u): u is string => typeof u === "string") : []),
        ].filter((u, i, arr) => arr.indexOf(u) === i);

        let imported = 0;
        for (const imageUrl of imageUrls) {
          const { data: res, error: fnErr } = await supabase.functions.invoke("import-research-image", {
            body: { image_url: imageUrl, artwork_id: created.id, owner_id: ownerId },
          });
          if (!fnErr && res?.ok) imported++;
        }
        toast.success(
          imported > 0
            ? `Artwork record created with ${imported} image${imported === 1 ? "" : "s"}`
            : imageUrls.length > 0
              ? "Artwork record created, but the image could not be downloaded from the source"
              : "Artwork record created"
        );
      } else if (f.kind === "image") {
        const p = f.payload as Record<string, unknown>;
        const imageUrl = (typeof p.image_url === "string" && p.image_url) || (typeof f.value === "string" ? f.value : "");
        if (!/^https?:\/\//i.test(imageUrl)) throw new Error("No usable image link on this finding");
        const { data: res, error: fnErr } = await supabase.functions.invoke("import-research-image", {
          body: { image_url: imageUrl, owner_id: ownerId, unlinked: true, role_context: "artist" },
        });
        if (fnErr || !res?.ok) throw new Error(res?.error || fnErr?.message || "Could not download the image");
        toast.success("Image saved to your files");
      } else {
        toast.success("Kept in the workspace");
      }

      await mark(f.id, "accepted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not accept this finding");
    } finally {
      setBusy(null);
    }
  };

  const acceptAll = async (kind: Kind) => {
    const pending = findings.filter((f) => f.kind === kind && f.status === "new");
    for (const f of pending) {
      // sequential so ordering and quota checks stay predictable
      await accept(f);
    }
  };

  /** Re-runs the image download for findings that were accepted before image import worked. */
  const importMissingImages = async () => {
    setBusy("backfill");
    let done = 0;
    let failed = 0;
    try {
      for (const f of findings.filter((x) => x.kind === "artwork" && x.status === "accepted")) {
        const p = f.payload as Record<string, unknown>;
        const imageUrl = typeof p.image_url === "string" ? p.image_url : "";
        if (!/^https?:\/\//i.test(imageUrl)) continue;
        const title = String(p.title || f.label);
        const { data: art } = await supabase
          .from("artworks")
          .select("id")
          .eq("owner_id", ownerId)
          .eq("role_context", "artist")
          .eq("title", title)
          .order("created_at", { ascending: false })
          .limit(1);
        const artworkId = art?.[0]?.id;
        if (!artworkId) continue;
        const { count } = await supabase
          .from("artwork_images")
          .select("id", { count: "exact", head: true })
          .eq("artwork_id", artworkId);
        if ((count ?? 0) > 0) continue;
        const { data: res, error } = await supabase.functions.invoke("import-research-image", {
          body: { image_url: imageUrl, artwork_id: artworkId, owner_id: ownerId },
        });
        if (!error && res?.ok) done++;
        else failed++;
      }
      for (const f of findings.filter((x) => x.kind === "image" && x.status === "accepted")) {
        const p = f.payload as Record<string, unknown>;
        const imageUrl = (typeof p.image_url === "string" && p.image_url) || f.value || "";
        if (!/^https?:\/\//i.test(imageUrl)) continue;
        const { data: res, error } = await supabase.functions.invoke("import-research-image", {
          body: { image_url: imageUrl, owner_id: ownerId, unlinked: true, role_context: "artist" },
        });
        if (!error && res?.ok) done++;
        else failed++;
      }
      toast.success(`${done} image${done === 1 ? "" : "s"} imported${failed ? `, ${failed} could not be downloaded` : ""}`);
    } finally {
      setBusy(null);
    }
  };


  const deleteRun = async (id: string) => {
    const { error } = await supabase.from("research_runs").delete().eq("id", id);
    if (error) {
      toast.error("Only the artist can clear a research session");
      return;
    }
    setActiveRun(null);
    await load();
    toast.success("Research session cleared");
  };

  const grouped = useMemo(() => {
    const g: Record<Kind, Finding[]> = { profile_field: [], cv_entry: [], artwork: [], image: [] };
    for (const f of findings) {
      if (f.kind in g) g[f.kind as Kind].push(f);
    }
    return g;
  }, [findings]);

  const currentRun = runs.find((r) => r.id === activeRun) || null;
  const sources = Array.isArray(currentRun?.sources) ? (currentRun!.sources as string[]) : [];

  const renderList = (kind: Kind) => {
    const items = grouped[kind];
    const pending = items.filter((f) => f.status === "new").length;
    if (!items.length) {
      return <p className="text-sm text-muted-foreground py-6">Nothing found in this category yet.</p>;
    }
    return (
      <div className="space-y-2">
        {pending > 1 && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => acceptAll(kind)}>
              Accept all {pending}
            </Button>
          </div>
        )}
        {items.map((f) => (
          <div
            key={f.id}
            className={`border border-border rounded-sm p-3 flex items-start justify-between gap-4 ${
              f.status !== "new" ? "opacity-60" : ""
            }`}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium break-words">{f.label}</p>
                {f.status === "accepted" && <Badge variant="secondary" className="text-[10px]">Accepted</Badge>}
                {f.status === "rejected" && <Badge variant="outline" className="text-[10px]">Dismissed</Badge>}
              </div>
              {kind === "image" ? (
                <img
                  src={f.value || ""}
                  alt={f.label}
                  loading="lazy"
                  className="max-h-40 rounded-sm border border-border object-contain bg-secondary/30"
                />
              ) : (
                f.value && f.value !== f.label && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line break-words">{f.value}</p>
                )
              )}
              {kind === "artwork" && typeof f.payload?.image_url === "string" && (
                <img
                  src={f.payload.image_url as string}
                  alt={f.label}
                  loading="lazy"
                  className="max-h-32 rounded-sm border border-border object-contain bg-secondary/30"
                />
              )}
              {typeof f.payload?.quote === "string" && (
                <p className="text-xs text-muted-foreground italic break-words">“{f.payload.quote as string}”</p>
              )}

              {f.source_url && (
                <a
                  href={f.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground underline break-all"
                >
                  <ExternalLink className="w-3 h-3" /> source
                </a>
              )}
            </div>
            {f.status === "new" && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={busy === f.id}
                  onClick={() => accept(f)}
                >
                  {busy === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {kind === "image" ? "Keep" : "Accept"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => mark(f.id, "rejected")}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Point the research at the artist website and any gallery pages. Each page is read on its own, and relevant
          subpages such as works, exhibitions and publications are followed automatically. Only what is actually
          written on a page is kept, together with the sentence that states it. Everything lands in this temporary
          workspace: profile facts, CV lines, artwork records and images. Nothing reaches the archive until it is
          accepted here.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Websites to read (one per line)</Label>
            <Textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={4}
              placeholder={"https://artistwebsite.com\nhttps://gallery.com/artists/name"}
              className="mt-1 font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Optional hint</Label>
            <Input
              value={hints}
              onChange={(e) => setHints(e.target.value)}
              placeholder="e.g. represented by Galleri K (used to find pages, never as a fact)"
              className="mt-1"
              autoComplete="off"
            />
            <Button onClick={run} disabled={running} className="mt-3 gap-1.5">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {running ? "Researching…" : "Run research"}
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      ) : !currentRun ? (
        <p className="text-sm text-muted-foreground">No research session yet. Run the research above to start one.</p>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {runs.map((r) => (
                <Button
                  key={r.id}
                  variant={r.id === activeRun ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveRun(r.id)}
                >
                  {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={load} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={importMissingImages}
                disabled={busy === "backfill"}
                className="gap-1.5"
              >
                {busy === "backfill" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Import missing images
              </Button>

              {!asRegistrar && (
                <Button variant="ghost" size="sm" onClick={() => deleteRun(currentRun.id)} className="gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>

          {currentRun.status === "failed" && (
            <p className="text-sm text-destructive">This session failed: {currentRun.error || "unknown error"}</p>
          )}

          <Tabs defaultValue="profile_field">
            <TabsList>
              {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
                <TabsTrigger key={k} value={k}>
                  {KIND_LABELS[k]} ({grouped[k].length})
                </TabsTrigger>
              ))}
            </TabsList>
            {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
              <TabsContent key={k} value={k} className="mt-4">
                {renderList(k)}
              </TabsContent>
            ))}
          </Tabs>

          {sources.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Sources consulted</p>
              {sources.slice(0, 20).map((s) => (
                <a key={s} href={s} target="_blank" rel="noreferrer" className="block text-xs text-muted-foreground underline break-all">
                  {s}
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
