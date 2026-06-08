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

  // Validate the code via security-definer RPC (table is no longer publicly readable)
  const { data: validation } = await supabase
    .rpc("validate_invite_code", { _code: inviteCode });

  const codeData = Array.isArray(validation) ? validation[0] : validation;
  if (!codeData || !codeData.is_valid) return;

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

  // Update artist_invites status to 'registered' if tracked
  await supabase
    .from("artist_invites")
    .update({ status: "registered" })
    .eq("invite_code_id", codeData.id);
}
