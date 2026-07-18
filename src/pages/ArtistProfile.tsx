import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Save, Globe, Phone, Mail, Camera, Loader2, Eye, EyeOff, Pencil, Gavel } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import CvManager from "../components/CvManager";
import GallerySearch from "../components/GallerySearch";
import { getPhonePrefixForCountry, COUNTRY_PHONE_CODES } from "@/lib/phoneCountryCodes";
import { AppLayout } from "@/components/AppLayout";
import { ProfilePresentationView, type ProfileViewData } from "@/components/ProfilePresentationView";
import { ManageRegistrarAccess } from "@/components/ManageRegistrarAccess";
import { UnitPreferenceSetting } from "@/components/UnitPreferenceSetting";

interface SocialLink {
  platform: string;
  url: string;
}

const PLATFORM_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /instagram\.com/i, name: "Instagram" },
  { pattern: /facebook\.com|fb\.com/i, name: "Facebook" },
  { pattern: /twitter\.com|x\.com/i, name: "X (Twitter)" },
  { pattern: /linkedin\.com/i, name: "LinkedIn" },
  { pattern: /tiktok\.com/i, name: "TikTok" },
  { pattern: /youtube\.com|youtu\.be/i, name: "YouTube" },
  { pattern: /pinterest\.com/i, name: "Pinterest" },
  { pattern: /behance\.net/i, name: "Behance" },
  { pattern: /artsy\.net/i, name: "Artsy" },
  { pattern: /tumblr\.com/i, name: "Tumblr" },
  { pattern: /vimeo\.com/i, name: "Vimeo" },
  { pattern: /threads\.net/i, name: "Threads" },
  { pattern: /bluesky|bsky\.app/i, name: "Bluesky" },
];

const detectPlatform = (url: string): string => {
  for (const { pattern, name } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return name;
  }
  return "";
};

interface Gallery {
  name: string;
  phone: string;
  website: string;
}

function VisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={`shrink-0 gap-1.5 ${visible ? "text-muted-foreground" : "text-destructive"}`}
      title={visible ? "Visible on public profile — click to hide" : "Hidden from public profile — click to show"}
    >
      {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      {visible ? "Visible" : "Hidden"}
    </Button>
  );
}

const ArtistProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [idVerified, setIdVerified] = useState(false);

  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [isDeceased, setIsDeceased] = useState(false);
  const [deathYear, setDeathYear] = useState("");
  const [committeeConnected, setCommitteeConnected] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [studioAddress, setStudioAddress] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [biography, setBiography] = useState("");
  const [cv, setCv] = useState("");
  const [chronology, setChronology] = useState("");
  const [willingToLend, setWillingToLend] = useState(false);
  const [lendingNotes, setLendingNotes] = useState("");
  const [globalArtistId, setGlobalArtistId] = useState<number | null>(null);
  const [contactVisibility, setContactVisibility] = useState<{
    studio_address: boolean;
    phone: boolean;
    email: boolean;
    website: boolean;
  }>({ studio_address: true, phone: true, email: true, website: true });

  const toggleVisibility = (field: "studio_address" | "phone" | "email" | "website") =>
    setContactVisibility((v) => ({ ...v, [field]: !v[field] }));

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);

      // Use active role from localStorage (set by sidebar role switcher)
      const activeRole = localStorage.getItem("activeRole");
      if (activeRole) {
        setUserRole(activeRole);
      } else {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (roleData) setUserRole(roleData.role);
      }

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
      setIdVerified(data.id_verified || false);
      setAvatarUrl((data as any).avatar_url || null);
      setFullName(data.full_name || "");
      setGlobalArtistId(data.global_artist_id);
      setBirthYear((data as any).birth_year?.toString() || "");
      setIsDeceased((data as any).is_deceased || false);
      setDeathYear((data as any).death_year?.toString() || "");
      setCommitteeConnected((data as any).committee_connected || false);
      setCity((data as any).city || "");
      setCountry((data as any).country || "");
      setStudioAddress((data as any).studio_address || "");
      setPhonePrefix((data as any).phone_prefix || "");
      setPhone((data as any).phone || "");
      setEmail((data as any).email || "");
      setWebsite((data as any).website || "");
      setSocialLinks((data as any).social_media_links || []);
      setGalleries((data as any).galleries || []);
      setBiography((data as any).biography || "");
      setCv((data as any).cv || "");
      setChronology((data as any).chronology || "");
      setWillingToLend((data as any).willing_to_lend || false);
      setLendingNotes((data as any).lending_notes || "");
      const cv = (data as any).contact_visibility;
      if (cv && typeof cv === "object") {
        setContactVisibility({
          studio_address: cv.studio_address !== false,
          phone: cv.phone !== false,
          email: cv.email !== false,
          website: cv.website !== false,
        });
      }
      if (!(data as any).phone_prefix && (data as any).country) {
        const autoPrefix = getPhonePrefixForCountry((data as any).country);
        if (autoPrefix) setPhonePrefix(autoPrefix);
      }
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
        is_deceased: isDeceased,
        death_year: isDeceased && deathYear ? parseInt(deathYear) : null,
        committee_connected: committeeConnected,
        city: city || null,
        country: country || null,
        studio_address: studioAddress || null,
        phone_prefix: phonePrefix || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        social_media_links: socialLinks,
        galleries: galleries,
        biography: biography || null,
        cv: cv || null,
        chronology: chronology || null,
        contact_visibility: contactVisibility,
      } as any)
      .eq("id", profileId);
    setSaving(false);
    if (error) { toast.error("Failed to save profile"); }
    else { toast.success("Profile saved"); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !profileId) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
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
  const updateSocialLinkUrl = (i: number, url: string) => {
    const updated = [...socialLinks];
    const platform = detectPlatform(url);
    updated[i] = { platform, url };
    setSocialLinks(updated);
  };

  const addGallery = () => setGalleries([...galleries, { name: "", phone: "", website: "" }]);
  const removeGallery = (i: number) => setGalleries(galleries.filter((_, idx) => idx !== i));
  const updateGallery = (i: number, field: keyof Gallery, value: string) => {
    const updated = [...galleries];
    updated[i] = { ...updated[i], [field]: value };
    setGalleries(updated);
  };

  const isCollector = userRole === "collector";
  const isRegistrar = userRole === "registrar";
  const profileTitle = isRegistrar ? "Registrar Profile" : isCollector ? "Collector Profile" : "Artist Profile";

  if (loading) {
    return (
      <AppLayout title={profileTitle}>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading profile…</p>
        </div>
      </AppLayout>
    );
  }

  const profileViewData: ProfileViewData | null = globalArtistId ? {
    full_name: fullName || null,
    avatar_url: avatarUrl,
    birth_year: birthYear ? parseInt(birthYear) : null,
    city: city || null,
    country: country || null,
    studio_address: studioAddress || null,
    phone_prefix: phonePrefix || null,
    phone: phone || null,
    email: email || null,
    website: website || null,
    social_media_links: socialLinks,
    galleries: galleries,
    biography: biography || null,
    chronology: chronology || null,
    global_artist_id: globalArtistId,
    id_verified: idVerified,
    contact_visibility: contactVisibility,
  } : null;

  const headerActions = editMode ? (
    <>
      <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Saving…" : "Save"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setEditMode(false)} className="gap-1.5">
        <Eye className="w-4 h-4" /> Done
      </Button>
    </>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
      <Pencil className="w-3.5 h-3.5" /> Edit
    </Button>
  );

  // Collector: simplified profile
  if (isCollector) {
    return (
      <AppLayout title={profileTitle} headerActions={
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      }>
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
          <section className="space-y-6">
            <h2 className="text-2xl">Collector Information</h2>
            <p className="text-sm text-muted-foreground">
              Please enter your full name exactly as it appears on your passport or government-issued ID, as this will be used for identity verification.
            </p>
            <div>
              <Label>Full Name (as in passport)</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full legal name" className="mt-1" />
            </div>
          </section>

          <Separator />

          <section className="space-y-6">
            <h2 className="text-2xl">Contact Details</h2>
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="collector@example.com" className="mt-1" type="email" />
              </div>
              <div>
                <Label className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Phone Number</Label>
                <p className="text-xs text-muted-foreground mb-1">Used for 2-factor security verification</p>
                <div className="flex gap-2">
                  <select
                    value={phonePrefix}
                    onChange={(e) => setPhonePrefix(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-[100px] shrink-0"
                  >
                    <option value="">Prefix</option>
                    {Object.entries(COUNTRY_PHONE_CODES)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([c, code]) => (
                        <option key={c} value={code}>{code} {c}</option>
                      ))}
                  </select>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="flex-1" />
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-2xl">Access Management</h2>
            <p className="text-sm text-muted-foreground">
              Grant registrars access to manage your collection on your behalf.
            </p>
            <ManageRegistrarAccess />
          </section>

          <Separator />

          <UnitPreferenceSetting />


          <div className="pt-6">
            <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Registrar: simplified profile with name, email, photo
  if (isRegistrar) {
    return (
      <AppLayout title={profileTitle} headerActions={
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      }>
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
          <section className="space-y-6">
            <h2 className="text-2xl">Registrar Information</h2>

            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-2 border-border">
                  <AvatarImage src={avatarUrl || undefined} alt="Profile photo" />
                  <AvatarFallback className="text-2xl">
                    {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">Click to upload or change</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="registrar@example.com" className="mt-1" type="email" />
              </div>
              <div>
                <Label className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Phone</Label>
                <div className="flex gap-2 mt-1">
                  <select
                    value={phonePrefix}
                    onChange={(e) => setPhonePrefix(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-[100px] shrink-0"
                  >
                    <option value="">Prefix</option>
                    {Object.entries(COUNTRY_PHONE_CODES)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([c, code]) => (
                        <option key={c} value={code}>{code} {c}</option>
                      ))}
                  </select>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="flex-1" />
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <UnitPreferenceSetting />


          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!editMode && profileViewData) {
    return (
      <AppLayout title={profileTitle} headerActions={headerActions}>
        <ProfilePresentationView profile={profileViewData} />
      </AppLayout>
    );
  }

  const sectionLinks: { id: string; label: string; indent?: boolean }[] = [
    { id: "basic-information", label: "Basic Information" },
    { id: "contacts-web", label: "Contacts & Web" },
    { id: "social-media-links", label: "Social Media Links" },
    { id: "galleries", label: "Galleries" },
    { id: "biography", label: "Biography" },
    { id: "cv", label: "CV" },
    { id: "cv", label: "Solo exhibitions", indent: true },
    { id: "cv", label: "Group exhibitions", indent: true },
    { id: "chronology", label: "Chronology" },
    { id: "access-management", label: "Access Management" },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppLayout title={profileTitle} headerActions={headerActions}>
      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-8">
        {/* Side navigation */}
        <aside className="hidden lg:block w-56 shrink-0 self-start sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <nav className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Jump to
            </p>
            {sectionLinks.map((link, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className={`block w-full text-left text-sm py-1.5 px-2 rounded hover:bg-muted hover:text-foreground transition-colors text-muted-foreground ${
                  link.indent ? "pl-6 text-xs" : ""
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 space-y-10 scroll-smooth">
        {/* Basic Info */}
        <section id="basic-information" className="space-y-6 scroll-mt-6">
          <h2 className="text-2xl">Basic Information</h2>
          <div className="flex flex-wrap items-start gap-6 justify-between">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-2 border-border">
                  <AvatarImage src={avatarUrl || undefined} alt="Profile photo" />
                  <AvatarFallback className="text-2xl">
                    {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">Click to upload or change</p>
              </div>
            </div>

            {/* Toggles: Committee + Deceased */}
            <div className="space-y-4 min-w-[260px]">
              <div className="flex items-center justify-between gap-4 p-3 rounded-md border border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <Gavel className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">Connect to Committee</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Enable Catalogue Raisonné review</p>
                </div>
                <Switch checked={committeeConnected} onCheckedChange={setCommitteeConnected} />
              </div>
              {committeeConnected && userId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/registrar/client/${userId}/committee`)}
                  className="w-full gap-1.5"
                >
                  <Gavel className="w-3.5 h-3.5" /> Go to Committee Review
                </Button>
              )}
              <div className="flex items-center justify-between gap-4 p-3 rounded-md border border-border">
                <div>
                  <p className="text-sm font-medium">Artist is deceased</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Show year of death on profile</p>
                </div>
                <Switch checked={isDeceased} onCheckedChange={setIsDeceased} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Artist name" className="mt-1" />
            </div>
            <div>
              <Label>Year of Birth</Label>
              <Input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="e.g. 1979" className="mt-1" />
            </div>
            {isDeceased && (
              <div>
                <Label>Year of Death</Label>
                <Input type="number" value={deathYear} onChange={(e) => setDeathYear(e.target.value)} placeholder="e.g. 2014" className="mt-1" />
              </div>
            )}
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Oslo" className="mt-1" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={country} onChange={(e) => {
                setCountry(e.target.value);
                const prefix = getPhonePrefixForCountry(e.target.value);
                if (prefix) setPhonePrefix(prefix);
              }} placeholder="e.g. Norway" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Studio Address</Label>
              <div className="flex gap-2 mt-1">
                <Input value={studioAddress} onChange={(e) => setStudioAddress(e.target.value)} placeholder="e.g. Prinsens gate 2, 0152 Oslo" className="flex-1" />
                <VisibilityToggle visible={contactVisibility.studio_address} onToggle={() => toggleVisibility("studio_address")} />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <section id="contacts-web" className="space-y-6 scroll-mt-6">
          <h2 className="text-2xl">Contacts & Web</h2>
          <p className="text-xs text-muted-foreground -mt-2">Toggle each field to show or hide it on your public profile.</p>
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Phone</Label>
              <div className="flex gap-2 mt-1">
                <select
                  value={phonePrefix}
                  onChange={(e) => setPhonePrefix(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-[100px] shrink-0"
                >
                  <option value="">Prefix</option>
                  {Object.entries(COUNTRY_PHONE_CODES)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([c, code]) => (
                      <option key={c} value={code}>{code} {c}</option>
                    ))}
                </select>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="flex-1" />
                <VisibilityToggle visible={contactVisibility.phone} onToggle={() => toggleVisibility("phone")} />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</Label>
              <div className="flex gap-2 mt-1">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="artist@example.com" className="flex-1" type="email" />
                <VisibilityToggle visible={contactVisibility.email} onToggle={() => toggleVisibility("email")} />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Website</Label>
              <div className="flex gap-2 mt-1">
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" className="flex-1" />
                <VisibilityToggle visible={contactVisibility.website} onToggle={() => toggleVisibility("website")} />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <section id="social-media-links" className="space-y-6 scroll-mt-6">
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
              <div key={i} className="flex gap-3 items-center">
                {link.platform && (
                  <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground whitespace-nowrap min-w-[80px] text-center">
                    {link.platform}
                  </span>
                )}
                <div className="flex-1">
                  <Input value={link.url} onChange={(e) => updateSocialLinkUrl(i, e.target.value)} placeholder="Paste social media link…" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeSocialLink(i)} className="shrink-0">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section id="galleries" className="space-y-6 scroll-mt-6">
          <h2 className="text-2xl">Galleries</h2>
          <GallerySearch galleries={galleries} onGalleriesChange={setGalleries} />
        </section>

        <Separator />

        <section id="biography" className="space-y-4 scroll-mt-6">
          <h2 className="text-2xl">Biography</h2>
          <Textarea value={biography} onChange={(e) => setBiography(e.target.value)} placeholder="Write your biography…" rows={8} />
        </section>

        <Separator />

        <section id="cv" className="space-y-4 scroll-mt-6">
          <h2 className="text-2xl">CV</h2>
          {profileId && <CvManager profileId={profileId} />}
        </section>

        <Separator />

        <section id="chronology" className="space-y-4 scroll-mt-6">
          <h2 className="text-2xl">Chronology</h2>
          <Textarea value={chronology} onChange={(e) => setChronology(e.target.value)} placeholder="Timeline of significant events…" rows={8} />
        </section>

        <Separator />

        <section id="access-management" className="space-y-4 scroll-mt-6">
          <h2 className="text-2xl">Access Management</h2>
          <p className="text-sm text-muted-foreground">
            Grant registrars access to manage your catalogue raisonné on your behalf.
          </p>
          <ManageRegistrarAccess />
        </section>

        <Separator />

        <UnitPreferenceSetting />

        <div className="pt-6">
          <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ArtistProfile;
