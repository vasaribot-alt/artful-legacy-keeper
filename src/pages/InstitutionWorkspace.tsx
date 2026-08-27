import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Clock } from "lucide-react";

const InstitutionWorkspace = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setLoading(false);
    };
    check();
  }, [navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">Loading institution workspace…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Landmark className="h-8 w-8" />
          <h1 className="text-2xl font-semibold">GARF Institution Workspace</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Coming in a later phase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The institution workspace will support museums, kunsthalles, university collections, and corporate collections with loan requests, exhibition planning, and condition reports.
            </p>
            <p className="text-muted-foreground">
              For now, the gallery workspace is being built first because it reuses the existing artist and artwork foundation.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default InstitutionWorkspace;
