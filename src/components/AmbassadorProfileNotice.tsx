import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { artistAmbassadorMilestones, isArtistAmbassadorEligible, isCollectorAmbassadorEligible } from "@/lib/ambassadorEligibility";

export function AmbassadorProfileNotice({ userId, role }: { userId: string | null; role?: string | null }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ambassador-profile-notice", userId, role],
    enabled: Boolean(userId),
    staleTime: 0,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userId) throw new Error("Session unavailable");
      const owner = session.user.id;
      const roles = await supabase.from("user_roles").select("role").eq("user_id", owner);
      if (roles.error) throw roles.error;
      const available = roles.data.map((entry) => entry.role as string);
      const stored = localStorage.getItem("activeRoleUser") === owner ? localStorage.getItem("activeRole") : null;
      const preferred = role ?? stored;
      const active = preferred && available.includes(preferred) ? preferred : available.includes("artist") ? "artist" : available.includes("collector") ? "collector" : available[0];
      if (active !== "artist" && active !== "collector") return { role: active, eligible: false, milestones: [], works: 0 };
      const works = await supabase.from("artworks").select("id", { count: "exact", head: true }).eq("owner_id", owner).eq("role_context", active);
      if (works.error) throw works.error;
      if (active === "collector") return { role: active, eligible: isCollectorAmbassadorEligible(works.count ?? 0), milestones: [], works: works.count ?? 0 };
      const profile = await supabase.from("profiles").select("id, biography, id_verified").eq("user_id", owner).single();
      if (profile.error) throw profile.error;
      const [photos, exhibitions, cv, site] = await Promise.all([
        supabase.from("artworks").select("id, artwork_images!inner(id)", { count: "exact", head: true }).eq("owner_id", owner).eq("role_context", "artist"),
        supabase.from("exhibitions").select("id", { count: "exact", head: true }).eq("user_id", owner),
        supabase.from("cv_entries").select("id", { count: "exact", head: true }).eq("profile_id", profile.data.id),
        supabase.from("artist_websites").select("is_enabled").eq("user_id", owner).maybeSingle(),
      ]);
      for (const result of [photos, exhibitions, cv, site]) if (result.error) throw result.error;
      const progress = { idVerified: profile.data.id_verified ?? false, biography: profile.data.biography,
        artworks: works.count ?? 0, worksWithPhotos: photos.count ?? 0, exhibitions: exhibitions.count ?? 0,
        cvEntries: cv.count ?? 0, websiteEnabled: site.data?.is_enabled ?? false };
      return { role: active, eligible: isArtistAmbassadorEligible(progress), milestones: artistAmbassadorMilestones(progress), works: works.count ?? 0 };
    },
  });

  if (!userId) return null;
  const completed = data?.milestones.filter((step) => step.complete).length ?? 0;
  return (
    <section aria-label="GARF ambassador program" className="border-y border-border py-6 space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Now launched</p>
      <h2 className="text-2xl">GARF Ambassador program</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">Support artists’ legacies by lending your name as a GARF ambassador — at no cost and with no obligations.</p>
      {isLoading && <p className="text-sm text-muted-foreground" role="status">Checking your invitation…</p>}
      {isError && <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-muted-foreground">We could not check your eligibility.</p><Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button></div>}
      {data?.role === "artist" && <p className="text-sm">{completed} of 7 milestones complete. {data.eligible ? "You’re invited to become a GARF Artist Ambassador." : "Artists completing at least 4 of the 7 milestones are invited to become GARF Artist Ambassadors."}</p>}
      {data?.role === "collector" && <p className="text-sm">{data.works} works registered. {data.eligible ? "You’re invited to become a GARF Collector Ambassador." : "Collectors with more than 10 registered works are invited to become GARF Collector Ambassadors."}</p>}
      <Button variant={data?.eligible ? "default" : "outline"} onClick={() => setOpen(true)} className="gap-2">
        {data?.eligible ? "View your invitation" : "About the ambassador program"}<ArrowRight className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>GARF Ambassadors</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="font-medium">An invitation to support artists’ legacies — at no cost and with no obligations</p>
            <p>This is an informal expression of support, not a governance or management role. No work, meetings, time commitment, donation or fundraising is required.</p>
            <p>As an ambassador, you simply allow GARF to name you as a supporter on our website and in presentations, communications and fundraising outreach. If someone asks you about GARF, we hope you will feel comfortable speaking positively about us.</p>
            <p>Any further involvement is entirely optional — for example mentioning GARF in relevant conversations or on social media, in your own words or using material we provide.</p>
            <p>We will always ask your approval before attributing any quotation to you. Your support is given in your personal capacity and does not imply endorsement by any organisation you are associated with. You may withdraw your permission at any time by letting us know.</p>
            {data?.role === "artist" && <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Artist milestones">{data.milestones.map((step) => <li key={step.label} className="flex items-center gap-2"><Check aria-hidden="true" className={`h-4 w-4 shrink-0 ${step.complete ? "text-foreground" : "text-muted-foreground opacity-30"}`} />{step.label}<span className="sr-only">{step.complete ? "Complete" : "Not complete"}</span></li>)}</ul>}
            {data?.eligible && <><p>You are invited. Contact the foundation if you would like to accept; your name will only be used with your explicit permission.</p><Button asChild className="gap-2"><Link to="/contact">Contact the foundation<ArrowRight className="h-4 w-4" /></Link></Button></>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}