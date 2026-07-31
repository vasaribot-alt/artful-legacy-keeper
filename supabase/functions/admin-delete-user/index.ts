// Foundation-admin only: permanently delete a user account and their data.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: isFoundation } = await admin.rpc("has_role", {
      _user_id: caller.id,
      _role: "foundation",
    });
    if (!isFoundation) return json({ error: "Not authorized" }, 403);

    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") return json({ error: "userId required" }, 400);
    if (userId === caller.id) return json({ error: "You cannot delete your own account" }, 400);

    // Remove owned records that would block the auth user deletion.
    const ownerTables: Array<[string, string]> = [
      ["artworks", "owner_id"],
      ["collector_facilities", "owner_id"],
      ["portfolios", "user_id"],
      ["exhibitions", "user_id"],
      ["catalogues", "user_id"],
      ["series_groups", "user_id"],
      ["user_uploads", "user_id"],
      ["user_storage_tiers", "user_id"],
      ["founding_artists", "user_id"],
      ["user_roles", "user_id"],
      ["profiles", "user_id"],
    ];

    for (const [table, col] of ownerTables) {
      const { error } = await admin.from(table).delete().eq(col, userId);
      if (error) console.error(`delete ${table} failed:`, error.message);
    }

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) return json({ error: authError.message }, 400);

    console.log(`User ${userId} deleted by ${caller.id}`);
    return json({ success: true });
  } catch (e) {
    console.error("admin-delete-user error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
