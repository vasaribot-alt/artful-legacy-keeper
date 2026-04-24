import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves the "active owner" context for a page.
 * - On registrar client routes (/registrar/client/:ownerId/...), returns the client's owner_id.
 * - Otherwise returns the authenticated user's id (normal owner mode).
 */
export function useActiveOwner() {
  const { ownerId: routeOwnerId } = useParams<{ ownerId?: string }>();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [clientRole, setClientRole] = useState<"artist" | "collector">("artist");
  const [loading, setLoading] = useState(true);

  const isRegistrarContext = !!routeOwnerId;
  const ownerId = routeOwnerId || authUserId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setAuthUserId(user?.id ?? null);

      if (routeOwnerId) {
        const [{ data: profile }, { data: roles }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("user_id", routeOwnerId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", routeOwnerId),
        ]);
        if (cancelled) return;
        setClientName(profile?.full_name ?? null);
        const roleList = (roles || []).map((r: any) => r.role);
        setClientRole(roleList.includes("collector") && !roleList.includes("artist") ? "collector" : "artist");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [routeOwnerId]);

  return { ownerId, isRegistrarContext, clientName, clientRole, authUserId, loading };
}
