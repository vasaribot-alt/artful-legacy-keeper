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
import { Copy, Plus, Building2 } from "lucide-react";

interface PartnerOrg {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  contact_email: string | null;
  website: string | null;
  intro_text: string | null;
  dashboard_key: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
}

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const FoundationPartners = () => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<PartnerOrg[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "", country: "", contact_email: "", website: "", intro_text: "", parent_id: "" });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles?.some((r) => r.role === "foundation")) { navigate("/dashboard"); return; }
      setAllowed(true);
      await fetchData();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchData = async () => {
    const [orgRes, profileRes] = await Promise.all([
      supabase.from("partner_organisations").select("*").order("name"),
      supabase.from("profiles").select("partner_org_id").not("partner_org_id", "is", null),
    ]);
    if (orgRes.data) setOrgs(orgRes.data as PartnerOrg[]);
    const tally: Record<string, number> = {};
    (profileRes.data || []).forEach((p: { partner_org_id: string | null }) => {
      if (p.partner_org_id) tally[p.partner_org_id] = (tally[p.partner_org_id] || 0) + 1;
    });
    setCounts(tally);
    setLoading(false);
  };

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = slugify(form.slug || form.name);
    if (!form.name.trim() || !slug) {
      toast.error("Name is required");
      return;
    }
    const { error } = await supabase.from("partner_organisations").insert({
      name: form.name.trim(),
      slug,
      country: form.country.trim() || null,
      contact_email: form.contact_email.trim() || null,
      website: form.website.trim() || null,
      intro_text: form.intro_text.trim() || null,
      parent_id: form.parent_id || null,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That link slug is already in use" : "Could not create partner");
      return;
    }
    toast.success("Partner organisation added");
    setForm({ name: "", slug: "", country: "", contact_email: "", website: "", intro_text: "", parent_id: "" });
    fetchData();
  };

  const toggleActive = async (org: PartnerOrg) => {
    const { error } = await supabase
      .from("partner_organisations")
      .update({ is_active: !org.is_active })
      .eq("id", org.id);
    if (error) { toast.error("Could not update"); return; }
    setOrgs((prev) => prev.map((o) => (o.id === org.id ? { ...o, is_active: !o.is_active } : o)));
  };

  if (!allowed || loading) return null;

  const origin = window.location.origin;

  const ordered = orgs
    .filter((o) => !o.parent_id)
    .flatMap((p) => [p, ...orgs.filter((c) => c.parent_id === p.id)])
    .concat(orgs.filter((o) => o.parent_id && !orgs.some((p) => p.id === o.parent_id)));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="h-6 w-6" />
            <h1 className="text-2xl font-semibold">Partner Organisations</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Give each member organisation a branded join link and a read-only, aggregate-only board dashboard.
            No member lists are ever requested.
          </p>
        </div>

        <section className="border border-border rounded-sm p-6 space-y-4">
          <h2 className="text-lg font-medium">Add a partner</h2>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2" autoComplete="off">
            <div>
              <Label htmlFor="name">Organisation name</Label>
              <Input id="name" value={form.name} autoComplete="off" onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="slug">Link slug</Label>
              <Input
                id="slug"
                value={form.slug}
                autoComplete="off"
                placeholder={slugify(form.name) || "iaa-usa"}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="country">Country or region</Label>
              <Input id="country" value={form.country} autoComplete="off" onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="contact_email">Contact email</Label>
              <Input id="contact_email" value={form.contact_email} autoComplete="off" onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} autoComplete="off" onChange={(e) => setForm({ ...form, website: e.target.value })} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="parent_id">Umbrella organisation (optional)</Label>
              <select
                id="parent_id"
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                className="mt-1.5 w-full h-10 rounded-sm border border-input bg-background px-3 text-sm"
              >
                <option value="">None, this is a standalone or umbrella organisation</option>
                {orgs
                  .filter((o) => !o.parent_id)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                Pick an umbrella to make this a country level committee. The umbrella board sees the
                combined figures plus a per country breakdown, while this committee's own key shows only
                its own members.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="intro_text">Intro text on the join page</Label>
              <Textarea id="intro_text" rows={3} value={form.intro_text} onChange={(e) => setForm({ ...form, intro_text: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-1" /> Add partner
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Partners ({orgs.length})</h2>
          {orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No partner organisations yet.</p>
          ) : (
            <div className="space-y-4">
              {ordered.map((org) => {
                const parent = org.parent_id ? orgs.find((o) => o.id === org.parent_id) : null;
                const joinUrl = `${origin}/join/${org.slug}`;
                const dashUrl = `${origin}/partners/${org.slug}?key=${org.dashboard_key}`;
                return (
                  <div
                    key={org.id}
                    className={`border border-border rounded-sm p-5 space-y-3 ${parent ? "ml-6" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">{org.name}</span>
                      {org.country && <Badge variant="outline" className="text-xs">{org.country}</Badge>}
                      {parent && (
                        <Badge variant="outline" className="text-xs">Under {parent.name}</Badge>
                      )}
                      <Badge variant={org.is_active ? "secondary" : "outline"} className="text-xs">
                        {org.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {counts[org.id] || 0} member(s) joined
                      </span>
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => toggleActive(org)}>
                        {org.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">Join link</span>
                        <code className="font-mono text-xs truncate">{joinUrl}</code>
                        <Button variant="ghost" size="sm" onClick={() => copy(joinUrl, "Join link")}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">Board dashboard</span>
                        <code className="font-mono text-xs truncate">{dashUrl}</code>
                        <Button variant="ghost" size="sm" onClick={() => copy(dashUrl, "Dashboard link")}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default FoundationPartners;
