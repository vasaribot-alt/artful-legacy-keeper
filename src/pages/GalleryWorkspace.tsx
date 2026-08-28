import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Users, Archive, Lock, Send, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

type GalleryAccount = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  vat_number: string | null;
  business_id: string | null;
};

type Representation = {
  id: string;
  gallery_id: string;
  artist_id: string | null;
  status: "invited" | "pending" | "approved" | "declined" | "ended";
  notes: string | null;
  artist_name: string | null;
  artist_email: string | null;
};

type InventoryItem = {
  id: string;
  artwork_id: string;
  title: string | null;
  year: number | null;
  consignment_status: string;
  artist_name: string | null;
};

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  invited: { label: "Invited (not on GARF)", variant: "outline" },
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  declined: { label: "Declined", variant: "destructive" },
  ended: { label: "Ended", variant: "outline" },
};

const GalleryWorkspace = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [gallery, setGallery] = useState<GalleryAccount | null>(null);
  const [representations, setRepresentations] = useState<Representation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<GalleryAccount>>({
    name: "",
    address: "",
    city: "",
    country: "",
    website: "",
    vat_number: "",
    business_id: "",
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { data: accessData } = await supabase.rpc("has_gallery_workspace_access", { _user_id: user.id });
    setHasAccess(!!accessData);

    const { data: galleryData } = await supabase
      .from("gallery_accounts")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (galleryData) {
      setGallery(galleryData);
      setForm(galleryData);
      await loadRoster(galleryData.id);
      await loadInventory(galleryData.id);
    }

    setLoading(false);
  };

  const loadRoster = async (galleryId: string) => {
    const { data, error } = await supabase.rpc("get_gallery_roster", { _gallery_id: galleryId });

    if (error) {
      toast.error("Could not load the artist roster");
      return;
    }

    setRepresentations(
      (data || []).map((r: any) => ({
        id: r.id,
        gallery_id: r.gallery_id,
        artist_id: r.artist_id,
        status: r.status,
        notes: r.notes,
        artist_name: r.artist_name || null,
        artist_email: r.artist_email || null,
      }))
    );
  };


  const loadInventory = async (galleryId: string) => {
    const { data } = await supabase
      .from("gallery_inventory")
      .select("id, consignment_status, artwork:artworks!gallery_inventory_artwork_id_fkey(id, title, year, owner_id)")
      .eq("gallery_id", galleryId)
      .order("created_at", { ascending: false });

    if (data) {
      const artistIds = [...new Set(data.map((i: any) => i.artwork?.owner_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", artistIds);

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));

      setInventory(
        data.map((i: any) => ({
          id: i.id,
          artwork_id: i.artwork?.id,
          title: i.artwork?.title || null,
          year: i.artwork?.year || null,
          consignment_status: i.consignment_status,
          artist_name: profileMap[i.artwork?.owner_id] || null,
        }))
      );
    }
  };

  const handleSaveProfile = async () => {
    if (!form.name?.trim()) { toast.error("Gallery name is required"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const payload = {
      owner_id: user.id,
      name: form.name || "",
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      website: form.website || null,
      vat_number: form.vat_number || null,
      business_id: form.business_id || null,
    };

    if (gallery) {
      const { error } = await supabase.from("gallery_accounts").update(payload).eq("id", gallery.id);
      if (error) toast.error("Failed to update gallery profile");
      else toast.success("Gallery profile updated");
    } else {
      const { data, error } = await supabase.from("gallery_accounts").insert(payload).select().single();
      if (error) toast.error("Failed to create gallery profile");
      else {
        setGallery(data);
        toast.success("Gallery profile created");
      }
    }
    setSaving(false);
  };

  const handleSendRequest = async () => {
    if (!requestEmail.trim() || !gallery) return;
    setSending(true);

    const { data: artistId, error: lookupError } = await supabase.rpc("find_artist_by_email", {
      _email: requestEmail.trim(),
    });

    if (lookupError || !artistId) {
      toast.error("No artist account found with that email");
      setSending(false);
      return;
    }

    const { error } = await supabase.from("gallery_artist_representations").insert({
      gallery_id: gallery.id,
      artist_id: artistId as string,
      status: "pending",
      notes: requestNotes || null,
    });


    if (error) {
      if (error.code === "23505") toast.info("A representation request already exists for this artist");
      else toast.error("Failed to send request");
    } else {
      toast.success("Representation request sent");
      setRequestDialogOpen(false);
      setRequestEmail("");
      setRequestNotes("");
      await loadRoster(gallery.id);
    }
    setSending(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">Loading gallery workspace…</div>
      </AppLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Gallery Manager is donation unlocked
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                The GARF Gallery Manager is free for galleries that support the foundation. Make any donation to unlock the workspace.
              </p>
              <Button onClick={() => navigate("/donate")}>Go to Donations</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8" />
          <h1 className="text-2xl font-semibold">GARF Gallery Manager</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gallery Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Gallery name</Label>
              <Input id="name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_number">VAT number</Label>
              <Input id="vat_number" value={form.vat_number || ""} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_id">Business ID</Label>
              <Input id="business_id" value={form.business_id || ""} onChange={(e) => setForm({ ...form, business_id: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Artist Roster</CardTitle>
            {gallery && (
              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Send className="h-4 w-4 mr-2" /> Request artist</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send representation request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="artistEmail">Artist email</Label>
                      <Input id="artistEmail" type="email" value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} placeholder="artist@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Private note</Label>
                      <Textarea id="notes" value={requestNotes} onChange={(e) => setRequestNotes(e.target.value)} placeholder="How you know the artist, proposed terms, etc." />
                    </div>
                    <Button onClick={handleSendRequest} disabled={sending || !requestEmail.trim()} className="w-full">{sending ? "Sending…" : "Send request"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {representations.length === 0 ? (
              <div className="text-muted-foreground text-sm">No representation requests yet. Create your gallery profile and invite artists.</div>
            ) : (
              <div className="space-y-2">
                {representations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <div className="font-medium">{r.artist_name || "Unknown artist"}</div>
                      <div className="text-sm text-muted-foreground">{r.artist_email}</div>
                    </div>
                    <Badge variant={statusBadge[r.status].variant}>{statusBadge[r.status].label}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5" /> Consignment Inventory</CardTitle>
            <div className="text-sm text-muted-foreground">{inventory.length} work{inventory.length === 1 ? "" : "s"}</div>
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <div className="text-muted-foreground text-sm">No consigned works yet. Inventory records are created once an artist approves representation.</div>
            ) : (
              <div className="space-y-2">
                {inventory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <div className="font-medium">{item.title || "Untitled"}{item.year ? ` (${item.year})` : ""}</div>
                      <div className="text-sm text-muted-foreground">{item.artist_name}</div>
                    </div>
                    <Badge variant="outline">{item.consignment_status.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default GalleryWorkspace;
