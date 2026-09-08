import { supabase } from "@/integrations/supabase/client";

/**
 * Called after login to check if the user signed up with an invite code
 * and hasn't been enrolled as a founding artist yet.
 */
export async function redeemInviteCodeIfNeeded(userId: string) {
  // Check if already a founding artist
  const { data: existing } = await supabase
    .from("founding_artists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return; // Already enrolled

  // Get invite code from user metadata
  const { data: { user } } = await supabase.auth.getUser();
  const inviteCode = user?.user_metadata?.invite_code;
  if (!inviteCode) return;

  // Redeem atomically so a user can only claim the exact code they possess.
  await supabase.rpc("redeem_invite_code", { _code: inviteCode });
}
