import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import CvManager from "@/components/CvManager";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

const CvEdit = () => {
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();
      if (data) setProfileId(data.id);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const headerActions = (
    <Button variant="outline" size="sm" onClick={() => navigate("/profile/cv/view")} className="gap-1.5">
      <Eye className="w-4 h-4" /> View
    </Button>
  );

  if (loading) {
    return (
      <AppLayout title="CV">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="CV" headerActions={headerActions}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {profileId ? (
          <CvManager profileId={profileId} />
        ) : (
          <p className="text-muted-foreground text-center py-20">Profile not found.</p>
        )}
      </div>
    </AppLayout>
  );
};

export default CvEdit;
