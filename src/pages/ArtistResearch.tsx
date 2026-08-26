import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { ResearchWorkspace } from "@/components/ResearchWorkspace";

export default function ArtistResearch() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  return (
    <AppLayout title="Research workspace">
      {loading || !userId ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <ResearchWorkspace ownerId={userId} />
      )}
    </AppLayout>
  );
}
