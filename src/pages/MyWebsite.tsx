import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Globe, Loader2 } from "lucide-react";

interface WebsiteRow {
  id: string;
  user_id: string;
  is_enabled: boolean;
  slug: string;
  site_title: string | null;
  tagline: string | null;
  about_text: string | null;
  contact_options: { email?: boolean; phone?: boolean; gallery?: boolean };
  artwork_ids: string[] | null;
  custom_domain: string | null;
  custom_domain_status: string;
  billing_status: string;
  legacy_mode: boolean;
}

interface ArtworkOption {
  id: string;
  title: string;
  year: number | null;
  image_url: string | null;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

const MyWebsite = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [artistName, setArtistName] = useState("");
  const [row, setRow] = useState<WebsiteRow | null>(null);
  const [slug, setSlug] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [siteTitle, setSiteTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [showGallery, setShowGallery] = useState(true);
  const [customDomain, setCustomDomain] = useState("");
  const [artworks, setArtworks] = useState<ArtworkOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);

  const siteUrl = useMemo(
    () => (slug ? `${window.location.origin}/site/${slug}` : null),
    [slug]
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [{ data: profile }, { data: site }, { data: aws }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).single(),
        supabase.from("artist_websites").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("artworks")
          .select("id, title, year, image_url")
          .eq("owner_id", user.id)
          .eq("role_context", "artist")
          .order("created_at", { ascending: false }),
      ]);

      const name = profile?.full_name || "";
      setArtistName(name);
      setArtworks((aws as ArtworkOption[]) || []);

      if (site) {
        const s = site as WebsiteRow;
        setRow(s);
        setSlug(s.slug);
        setIsEnabled(s.is_enabled);
        setSiteTitle(s.site_title || "");
        setTagline(s.tagline || "");
        setAboutText(s.about_text || "");
        setShowEmail(s.contact_options?.email ?? true);
        setShowPhone(s.contact_options?.phone ?? false);
        setShowGallery(s.contact_options?.gallery ?? true);
        setCustomDomain(s.custom_domain || "");
        setSelectedIds(s.artwork_ids ? new Set(s.artwork_ids) : null);
      } else {
        setSlug(slugify(name));
        setSiteTitle(name);
      }
      setLoading(false);
    })();
  }, []);

  const toggleArtwork = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev ?? artworks.map((a) => a.id));
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const save = async () => {
    if (!userId) return;
    const cleanSlug = slugify(slug);
    if (cleanSlug.length < 3) {
      toast({ title: "Address too short", description: "The website address needs at least 3 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      slug: cleanSlug,
      is_enabled: isEnabled,
      site_title: siteTitle.trim() || null,
      tagline: tagline.trim() || null,
      about_text: aboutText.trim() || null,
      contact_options: { email: showEmail, phone: showPhone, gallery: showGallery },
      artwork_ids: selectedIds ? Array.from(selectedIds) : null,
      custom_domain: customDomain.trim() || null,
      custom_domain_status:
        customDomain.trim() && row?.custom_domain !== customDomain.trim()
          ? "pending"
          : row?.custom_domain_status ?? "none",
    };
    const { data, error } = row
      ? await supabase.from("artist_websites").update(payload).eq("id", row.id).select().single()
      : await supabase.from("artist_websites").insert(payload).select().single();
    setSaving(false);
    if (error) {
      toast({
        title: error.code === "23505" ? "Address taken" : "Could not save",
        description: error.code === "23505" ? "Another artist already uses this address. Please choose a different one." : error.message,
        variant: "destructive",
      });
      return;
    }
    setRow(data as WebsiteRow);
    setSlug((data as WebsiteRow).slug);
    toast({ title: "Saved ✓" });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8">
          <h1 className="font-serif text-3xl">My Website</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your own public website, built automatically from the records you keep here.
            It is free while card payments are being activated; a one-off setup fee and a
            small annual fee will apply later, for as long as you live. After that, your
            website remains online as part of your preserved legacy.
          </p>
        </header>

        <div className="space-y-8">
          <section className="rounded-lg border border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-medium">Website online</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Switch on to publish your website at the address below.
                </p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            <div className="mt-6">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Website address</label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/site/</span>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="max-w-xs" autoComplete="off" />
              </div>
              {siteUrl && (
                <p className="mt-2 text-sm">
                  <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
                    {siteUrl.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border p-6">
            <h2 className="font-medium">Home page</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Site title</label>
                <Input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} placeholder={artistName} className="mt-2" autoComplete="off" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Intro line</label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Painter, based in Oslo" className="mt-2" autoComplete="off" />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border p-6">
            <h2 className="font-medium">About page</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Leave empty to use the biography from your artist profile.
            </p>
            <Textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              rows={6}
              className="mt-3"
              placeholder="Write the text visitors will read on your About page…"
            />
          </section>

          <section className="rounded-lg border border-border p-6">
            <h2 className="font-medium">Contact page</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose what visitors can see. A visible email address makes it easy for people to reach you.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-center gap-3">
                <Checkbox checked={showEmail} onCheckedChange={(v) => setShowEmail(Boolean(v))} />
                Show my email address
              </label>
              <label className="flex items-center gap-3">
                <Checkbox checked={showPhone} onCheckedChange={(v) => setShowPhone(Boolean(v))} />
                Show my phone number
              </label>
              <label className="flex items-center gap-3">
                <Checkbox checked={showGallery} onCheckedChange={(v) => setShowGallery(Boolean(v))} />
                Show my gallery contacts
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border p-6">
            <h2 className="font-medium">Works page</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              By default all your registered works appear. Untick any work you do not want on the website.
            </p>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-2 text-sm">
              {artworks.length === 0 && (
                <p className="text-muted-foreground">
                  No works registered yet. Add works from your <Link to="/dashboard" className="underline underline-offset-4">artworks page</Link> first.
                </p>
              )}
              {artworks.map((aw) => {
                const checked = selectedIds ? selectedIds.has(aw.id) : true;
                return (
                  <label key={aw.id} className="flex items-center gap-3">
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleArtwork(aw.id, Boolean(v))} />
                    <span className="truncate">
                      {aw.title}
                      {aw.year ? ` (${aw.year})` : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border p-6">
            <h2 className="font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Your own domain</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              If you own a domain (for example yourname.com), enter it here. The Foundation will
              contact you with simple instructions to point it at your website.
            </p>
            <Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="yourname.com" className="mt-3 max-w-sm" autoComplete="off" />
            {row?.custom_domain_status === "pending" && (
              <p className="mt-2 text-sm text-muted-foreground">Domain request received. We will be in touch with setup instructions.</p>
            )}
            {row?.custom_domain_status === "approved" && row.custom_domain && (
              <p className="mt-2 text-sm">Your website also answers at <span className="underline underline-offset-4">{row.custom_domain}</span>.</p>
            )}
          </section>

          <section className="rounded-lg border border-border p-6">
            <h2 className="font-medium">Billing</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Payments are not yet active. Your website stays free until card payments launch,
              and we will always let you know before any fee applies. The fee covers your
              lifetime: one setup payment, then a small annual amount, for as long as you live.
            </p>
          </section>

          <div className="flex items-center gap-4 pb-10">
            <Button onClick={save} disabled={saving} className="min-w-32">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
            {isEnabled && siteUrl && (
              <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">
                View my website <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MyWebsite;
