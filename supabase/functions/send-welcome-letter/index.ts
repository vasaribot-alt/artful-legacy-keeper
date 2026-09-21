import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, callerHasRole, getCallerId } from "../_shared/auth.ts";
import { sendRawEmail } from "../_shared/send-raw-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toHtml(body: string) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 18px">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
  return `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#262626;max-width:560px">${paragraphs}</div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const callerId = await getCallerId(req);
    if (!callerId || !(await callerHasRole(callerId, "foundation"))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, subject, body } = await req.json();
    if (!user_id || typeof subject !== "string" || typeof body !== "string" || !subject.trim() || !body.trim()) {
      return new Response(JSON.stringify({ error: "user_id, subject and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();
    const { data: letter } = await admin
      .from("welcome_letters")
      .select("id, status")
      .eq("user_id", user_id)
      .maybeSingle();

    if (letter?.status === "sent") {
      return new Response(JSON.stringify({ error: "This letter has already been sent." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("user_id", user_id)
      .maybeSingle();

    const to = (profile?.email ?? "").trim();
    if (!to) {
      return new Response(JSON.stringify({ error: "This artist has no email address on file." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendRawEmail({
      to,
      subject: subject.trim(),
      html: toHtml(body.trim()),
      text: body.trim(),
      label: "welcome_letter",
      idempotencyKey: `welcome-letter-${letter?.id ?? user_id}`,
      replyTo: "outreach@globalartistregistry.org",
      fromName: "Global Artist Registry Foundation",
      fromLocalPart: "outreach",
    });

    if (!result.sent) {
      return new Response(
        JSON.stringify({ error: "This address has unsubscribed or bounced, so no letter was sent." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error } = await admin.from("welcome_letters").upsert(
      {
        user_id,
        status: "sent",
        subject: subject.trim(),
        body: body.trim(),
        sent_at: new Date().toISOString(),
        sent_by: callerId,
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-welcome-letter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
