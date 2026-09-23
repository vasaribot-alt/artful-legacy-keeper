import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Linkedin, Plus, Send, Trash2, ExternalLink, CheckCircle2 } from "lucide-react";

interface LinkedInPost {
  id: string;
  title: string;
  body: string;
  status: string;
  link_url: string | null;
  post_urn: string | null;
  published_at: string | null;
  last_error: string | null;
  created_at: string;
}

const SITE = "https://globalartistregistry.org";

const SERIES: { title: string; body: string }[] = [
  {
    title: "1 — When an artist dies, the archive often dies too",
    body: `When an artist dies, the archive often dies with them.

Boxes of slides in a cellar. A hard drive nobody can open. Dimensions that only the artist knew. Exhibitions nobody wrote down. Within a few years, works become "attributed to" — and value, scholarship and memory drain away.

This is not rare. It is the norm.

The Global Artist Registry Foundation exists to change that: a permanent, artist-authenticated record of a body of work, documented by the person who made it, while they can still confirm it.

Free for artists. Built for generations.

${SITE}

#ArtWorld #Artists #ArtArchive #Provenance #CatalogueRaisonne #ArtHistory`,
  },
  {
    title: "2 — Why we plan in 100 years, not in funding rounds",
    body: `Most platforms plan for the next funding round. We plan for the next hundred years.

The Global Artist Registry Foundation is a Dutch stichting with a 100-Year Preservation Plan: archival documentation standards, permanent identifiers for artist and work, and no owner who can sell the archive out from under the artists in it.

An artist receives a permanent GAR number. Every work receives a permanent GAWID. Those identifiers are meant to still resolve long after all of us have stopped working.

Free for artists. Built for generations.

${SITE}

#ArtArchive #Preservation #Museums #Registrars #ArtHistory #CulturalHeritage`,
  },
  {
    title: "3 — The handover: from the artist to the heirs",
    body: `The hardest moment in any artist's archive is the handover.

An estate inherits the works — and, too often, inherits guesswork. Which version is the original? What was the edition? Where was it shown? Who owns what?

So we built succession into the registry itself. An artist names their successor. The foundation confirms the handover. The heirs receive full management of the archive, and the public record shows the estate custodianship openly.

The archive keeps working when the artist no longer can.

Free for artists. Built for generations.

${SITE}

#Estates #ArtEstate #Provenance #ArtLaw #Collectors #ArtArchive`,
  },
  {
    title: "4 — A permanent number, free, for every artist",
    body: `An invitation, plainly put.

If you are a visual artist: you can register your body of work in the Global Artist Registry, document each work to archival standard, and receive a permanent GAR number for yourself and a GAWID for every work. Identity is verified, so the record carries weight.

It costs the artist nothing. We are a foundation, not a marketplace. We take no commission and we sell nothing.

If you know an artist who should be in it, send them this.

Free for artists. Built for generations.

${SITE}

#Artists #VisualArt #ArtArchive #Provenance #ArtWorld #CatalogueRaisonne`,
  },
];

const FoundationLinkedIn = () => {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<LinkedInPost[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { title: string; body: string; link_url: string }>>({});

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles?.some((r) => r.role === "foundation")) { navigate("/dashboard"); return; }
      setAllowed(true);
      await load();
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const load = async () => {
    const { data } = await supabase
      .from("linkedin_posts")
      .select("*")
      .order("created_at", { ascending: true });
    const list = (data || []) as LinkedInPost[];
    setPosts(list);
    setDrafts(
      Object.fromEntries(
        list.map((p) => [p.id, { title: p.title, body: p.body, link_url: p.link_url || "" }]),
      ),
    );
  };

  const invokeError = async (error: unknown) => {
    if (error instanceof FunctionsHttpError) {
      const text = await error.context.text();
      try {
        const parsed = JSON.parse(text) as { error?: string; details?: string };
        return parsed.details || parsed.error || text;
      } catch {
        return text;
      }
    }
    return error instanceof Error ? error.message : "Unknown error";
  };

  const checkAccount = async () => {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("linkedin-publish", {
      body: { mode: "identity" },
    });
    setChecking(false);
    if (error) {
      toast.error(await invokeError(error));
      setAccount(null);
      return;
    }
    const name = (data as { name?: string })?.name;
    setAccount(name || "Connected account");
    toast.success(`LinkedIn connected${name ? `: ${name}` : ""}`);
  };

  const addPost = async (seed?: { title: string; body: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("linkedin_posts").insert({
      title: seed?.title || "New post",
      body: seed?.body || "",
      link_url: SITE,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    await load();
  };

  const loadSeries = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("linkedin_posts").insert(
      SERIES.map((s) => ({ ...s, link_url: SITE, created_by: user?.id ?? null })),
    );
    if (error) { toast.error(error.message); return; }
    toast.success("Series added as drafts");
    await load();
  };

  const saveDraft = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    setBusyId(id);
    const { error } = await supabase
      .from("linkedin_posts")
      .update({ title: d.title, body: d.body, link_url: d.link_url || null, updated_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("linkedin_posts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  const publish = async (id: string) => {
    const d = drafts[id];
    if (!d?.body.trim()) { toast.error("Write the post text first"); return; }
    if (!confirm("Publish this post to LinkedIn now?")) return;
    setBusyId(id);
    await supabase
      .from("linkedin_posts")
      .update({ title: d.title, body: d.body, link_url: d.link_url || null })
      .eq("id", id);
    const { error } = await supabase.functions.invoke("linkedin-publish", {
      body: { mode: "publish", post_id: id },
    });
    setBusyId(null);
    if (error) {
      toast.error(await invokeError(error));
      await load();
      return;
    }
    toast.success("Published to LinkedIn");
    await load();
  };

  if (loading || !allowed) {
    return (
      <AppLayout>
        <div className="p-8 text-sm text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <Linkedin className="h-6 w-6" />
            <h1 className="text-3xl font-serif">LinkedIn</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Write the posts here and publish them straight to LinkedIn. Posts go out on the
            LinkedIn account connected to the foundation.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={checkAccount} disabled={checking}>
              {checking ? "Checking…" : "Check connection"}
            </Button>
            {account && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" /> {account}
              </span>
            )}
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => addPost()}>
            <Plus className="h-4 w-4 mr-2" /> New post
          </Button>
          <Button size="sm" variant="outline" onClick={loadSeries}>
            Add the four-post artist series
          </Button>
        </div>

        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground border rounded-lg p-6">
            No posts yet. Start a new one, or add the prepared four-post series.
          </p>
        )}

        <div className="space-y-6">
          {posts.map((post) => {
            const d = drafts[post.id] || { title: post.title, body: post.body, link_url: post.link_url || "" };
            const published = post.status === "published";
            return (
              <article key={post.id} className="border rounded-lg p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <Input
                    value={d.title}
                    autoComplete="off"
                    disabled={published}
                    onChange={(e) => setDrafts((s) => ({ ...s, [post.id]: { ...d, title: e.target.value } }))}
                    className="font-medium"
                  />
                  <Badge variant={published ? "default" : post.status === "failed" ? "destructive" : "secondary"}>
                    {published ? "Published" : post.status === "failed" ? "Failed" : "Draft"}
                  </Badge>
                </div>

                <Textarea
                  value={d.body}
                  rows={12}
                  disabled={published}
                  onChange={(e) => setDrafts((s) => ({ ...s, [post.id]: { ...d, body: e.target.value } }))}
                />
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                  <span>{d.body.length} characters</span>
                  {post.published_at && <span>Published {new Date(post.published_at).toLocaleString()}</span>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Link shown with the post (optional)</Label>
                  <Input
                    value={d.link_url}
                    autoComplete="off"
                    disabled={published}
                    onChange={(e) => setDrafts((s) => ({ ...s, [post.id]: { ...d, link_url: e.target.value } }))}
                  />
                </div>

                {post.last_error && !published && (
                  <p className="text-xs text-destructive break-words">{post.last_error}</p>
                )}

                <div className="flex flex-wrap gap-3">
                  {!published && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => saveDraft(post.id)} disabled={busyId === post.id}>
                        Save
                      </Button>
                      <Button size="sm" onClick={() => publish(post.id)} disabled={busyId === post.id}>
                        <Send className="h-4 w-4 mr-2" />
                        {busyId === post.id ? "Publishing…" : "Publish to LinkedIn"}
                      </Button>
                    </>
                  )}
                  {published && post.post_urn && (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={post.post_urn.startsWith("http")
                          ? post.post_urn
                          : `https://www.linkedin.com/feed/update/${post.post_urn}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" /> View on LinkedIn
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(post.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default FoundationLinkedIn;
