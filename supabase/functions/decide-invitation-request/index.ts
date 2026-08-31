// Foundation-only: approve an invitation request (issues an invite code and
// emails it to the applicant) or decline it.

import { adminClient, callerHasRole, getCallerId } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { sendRawEmail } from "../_shared/send-raw-email.ts";

const TIERS = ["internationally_established", "mid_career", "emerging", "peer"];
const SITE = "https://globalartistregistry.org";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const callerId = await getCallerId(req);
  if (!callerId) return json({ error: "Unauthorized" }, 401);
  if (!(await callerHasRole(callerId, "foundation"))) return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  const decision = body.decision === "declined" ? "declined" : body.decision === "approved" ? "approved" : "";
  const tier = TIERS.includes(String(body.tier)) ? String(body.tier) : "emerging";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!requestId || !decision) return json({ error: "requestId and decision are required" }, 400);

  const admin = adminClient();

  const { data: reqRow, error: reqError } = await admin
    .from("invitation_requests")
    .select("id, full_name, email, status, invite_code_id")
    .eq("id", requestId)
    .maybeSingle();

  if (reqError) {
    console.error("request lookup failed", { code: reqError.code, message: reqError.message });
    return json({ error: "Could not load the request" }, 500);
  }
  if (!reqRow) return json({ error: "Request not found" }, 404);

  if (decision === "declined") {
    const { error } = await admin
      .from("invitation_requests")
      .update({ status: "declined", reviewed_by: callerId, reviewed_at: new Date().toISOString(), foundation_notes: note || null })
      .eq("id", requestId);
    if (error) return json({ error: "Could not update the request" }, 500);
    return json({ ok: true, status: "declined" });
  }

  // Approve: issue a fresh invite code unless one was already issued.
  let code = "";
  let codeId = reqRow.invite_code_id as string | null;

  if (codeId) {
    const { data: existing } = await admin.from("invite_codes").select("code").eq("id", codeId).maybeSingle();
    code = existing?.code ?? "";
  }

  if (!code) {
    for (let attempt = 0; attempt < 6 && !code; attempt++) {
      const candidate = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      const { data, error } = await admin
        .from("invite_codes")
        .insert({ code: candidate, tier, created_by: callerId, is_active: true })
        .select("id, code")
        .single();
      if (!error && data) {
        code = data.code;
        codeId = data.id;
      }
    }
  }

  if (!code) return json({ error: "Could not create an invite code" }, 500);

  const { error: updateError } = await admin
    .from("invitation_requests")
    .update({
      status: "approved",
      invite_code_id: codeId,
      reviewed_by: callerId,
      reviewed_at: new Date().toISOString(),
      foundation_notes: note || null,
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("update failed", { code: updateError.code, message: updateError.message });
    return json({ error: "Could not update the request" }, 500);
  }

  const registerUrl = `${SITE}/register?invite=${encodeURIComponent(code)}`;
  let emailed = true;
  try {
    const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
  <h1 style="font-size:22px;margin:0 0 16px">Your invitation is ready</h1>
  <p style="font-size:15px;line-height:1.55">Dear ${esc(reqRow.full_name)},</p>
  <p style="font-size:15px;line-height:1.55">
    We are glad to invite you to the Global Artist Registry. Your personal invite code is:
  </p>
  <p style="font-size:26px;letter-spacing:3px;font-family:monospace;margin:24px 0">${esc(code)}</p>
  <p style="font-size:15px;line-height:1.55">
    <a href="${registerUrl}" style="color:#111">Create your account</a> and the code will be filled in for you.
  </p>
  ${note ? `<p style="font-size:15px;line-height:1.55">${esc(note).replace(/\n/g, "<br/>")}</p>` : ""}
  <p style="font-size:15px;line-height:1.55">
    Registration is free for life for every ID verified artist, and your records are kept in accordance with our
    100 Year Preservation Plan.
  </p>
  <p style="font-size:15px;line-height:1.55;margin-top:24px">
    Warm regards,<br/><em>Global Artist Registry Foundation</em>
  </p>
</div>`.trim();

    const result = await sendRawEmail({
      to: reqRow.email,
      subject: "Your invitation to the Global Artist Registry",
      html,
      label: "invitation_request_approved",
      idempotencyKey: `invitation-approved-${requestId}-${code}`,
    });
    emailed = result.sent;
  } catch (e) {
    console.error("approval email failed", e);
    emailed = false;
  }

  return json({ ok: true, status: "approved", code, emailed });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
