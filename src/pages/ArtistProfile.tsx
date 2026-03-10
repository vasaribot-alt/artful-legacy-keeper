import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Plus, Trash2, Save, Globe, Phone, Mail, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CvManager from "../components/CvManager";
import GallerySearch from "../components/GallerySearch";

interface SocialLink {
  platform: string;
  url: string;
}

interface Gallery {
  name: string;
  phone: string;
  website: string;
}

const ArtistProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [contacts, setContacts] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [biography, setBiography] = useState("");
  const [cv, setCv] = useState("");
  const [chronology, setChronology] = useState("");
  const [globalArtistId, setGlobalArtistId] = useState<number | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        toast.error("Could not load profile");
        setLoading(false);
        return;
      }

      setProfileId(data.id);
      setAvatarUrl((data as any).avatar_url || null);
      setFullName(data.full_name || "");
      setGlobalArtistId(data.global_artist_id);
      setBirthYear((data as any).birth_year?.toString() || "");
      setCity((data as any).city || "");
      setCountry((data as any).country || "");
      setContacts((data as any).contacts || "");
      setWebsite((data as any).website || "");
      setSocialLinks((data as any).social_media_links || []);
      setGalleries((data as any).galleries || []);
      setBiography((data as any).biography || "");
      setCv((data as any).cv || "");
      setChronology((data as any).chronology || "");
      setLoading(false);
    };
    loadProfile();
  }, [navigate]);

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        birth_year: birthYear ? parseInt(birthYear) : null,
        city: city || null,
        country: country || null,
        contacts: contacts || null,
        website: website || null,
        social_media_links: socialLinks,
        galleries: galleries,
        biography: biography || null,
        cv: cv || null,
        chronology: chronology || null,
      } as any)
      .eq("id", profileId);

    setSaving(false);
    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !profileId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

      const url = publicUrlData.publicUrl + "?t=" + Date.now();

      await supabase.from("profiles").update({ avatar_url: url } as any).eq("id", profileId);
      setAvatarUrl(url);
      toast.success("Profile photo updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const addSocialLink = () => setSocialLinks([...socialLinks, { platform: "", url: "" }]);
  const removeSocialLink = (i: number) => setSocialLinks(socialLinks.filter((_, idx) => idx !== i));
  const updateSocialLink = (i: number, field: keyof SocialLink, value: string) => {
    const updated = [...socialLinks];
    updated[i] = { ...updated[i], [field]: value };
    setSocialLinks(updated);
  };

  const addGallery = () => setGalleries([...galleries, { name: "", phone: "", website: "" }]);
  const removeGallery = (i: number) => setGalleries(galleries.filter((_, idx) => idx !== i));
  const updateGallery = (i: number, field: keyof Gallery, value: string) => {
    const updated = [...galleries];
    updated[i] = { ...updated[i], [field]: value };
    setGalleries(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold">Artist Profile</h1>
            {globalArtistId && (
              <span className="text-xs px-2 py-0.5 rounded-sm bg-foreground text-background font-mono tracking-wider">
                ID {globalArtistId}
              </span>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Basic Info */}
        <section className="space-y-6">
          <h2 className="text-2xl">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Artist name" className="mt-1" />
            </div>
            <div>
              <Label>Year of Birth</Label>
              <Input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="e.g. 1979" className="mt-1" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Oslo" className="mt-1" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Norway" className="mt-1" />
            </div>
          </div>
        </section>

        <Separator />

        {/* Contacts & Web */}
        <section className="space-y-6">
          <h2 className="text-2xl">Contacts & Web</h2>
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Contacts</Label>
              <Textarea value={contacts} onChange={(e) => setContacts(e.target.value)} placeholder="Phone, email, address…" className="mt-1" rows={3} />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" className="mt-1" />
            </div>
          </div>
        </section>

        <Separator />

        {/* Social Media */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl">Social Media Links</h2>
            <Button variant="outline" size="sm" onClick={addSocialLink} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
          {socialLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No social media links added yet.</p>
          )}
          <div className="space-y-3">
            {socialLinks.map((link, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-40">
                  <Input value={link.platform} onChange={(e) => updateSocialLink(i, "platform", e.target.value)} placeholder="Platform" />
                </div>
                <div className="flex-1">
                  <Input value={link.url} onChange={(e) => updateSocialLink(i, "url", e.target.value)} placeholder="https://…" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeSocialLink(i)} className="shrink-0">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Galleries */}
        <section className="space-y-6">
          <h2 className="text-2xl">Galleries</h2>
          <GallerySearch galleries={galleries} onGalleriesChange={setGalleries} />
        </section>

        <Separator />

        {/* Biography */}
        <section className="space-y-4">
          <h2 className="text-2xl">Biography</h2>
          <Textarea value={biography} onChange={(e) => setBiography(e.target.value)} placeholder="Write your biography…" rows={8} />
        </section>

        <Separator />

        {/* CV */}
        <section className="space-y-4">
          <h2 className="text-2xl">CV</h2>
          {profileId && <CvManager profileId={profileId} />}
        </section>

        <Separator />

        {/* Chronology */}
        <section className="space-y-4">
          <h2 className="text-2xl">Chronology</h2>
          <Textarea value={chronology} onChange={(e) => setChronology(e.target.value)} placeholder="Timeline of significant events…" rows={8} />
        </section>

        {/* Bottom Save */}
        <div className="pt-6">
          <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ArtistProfile;
