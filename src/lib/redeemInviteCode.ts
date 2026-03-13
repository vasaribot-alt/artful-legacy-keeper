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

  // Find the code
  const { data: codeData } = await supabase
    .from("invite_codes")
    .select("id, tier, used_by, is_active")
    .eq("code", inviteCode)
    .single();

  if (!codeData || !codeData.is_active || codeData.used_by) return;

  // Mark code as used
  await supabase
    .from("invite_codes")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("id", codeData.id);

  // Create founding artist record
  await supabase
    .from("founding_artists")
    .insert({
      user_id: userId,
      tier: codeData.tier,
      invite_code_id: codeData.id,
    });
}
