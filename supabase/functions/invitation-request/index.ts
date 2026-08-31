// Public endpoint: artists (and other roles) apply for an invitation to GARF.
// Inserts a row into invitation_requests, notifies the Foundation and sends the
// applicant a confirmation.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendRawEmail } from "../_shared/send-raw-email.ts";

const FOUNDATION_INBOX = Deno.env.get("FOUNDATION_INBOX_EMAIL") || "support@globalartistregistry.org";

const ROLES = ["artist", "collector", "gallery", "institution", "registrar"];

interface Body {
  full_name?: string;
  email?: string;
  country?: string;
  city?: string;
  website?: string;
  birth_year?: number;
  practice_summary?: string;
  cv_url?: string;
  referred_by?: string;
  applicant_role?: string;
  message?: string;
  source?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const full_name = (body.full_name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const applicant_role = ROLES.includes(body.applicant_role || "") ? body.applicant_role! : "artist";

    if (full_name.length < 2) return json({ error: "Name is required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Valid email required" }, 400);
    if ((body.practice_summary || "").trim().length < 20) {
      return json({ error: "Please tell us a little about your practice (at least 20 characters)" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Soft rate limit: one open application per email.
    const { data: existing } = await supabase
      .from("invitation_requests")
      .select("id, status")
      .eq("email", email)
      .in("status", ["new", "reviewing", "approved"])
      .maybeSingle();

    if (existing) {
      return json({ ok: true, duplicate: true, id: existing.id });
    }

    const insert = {
      full_name,
      email,
      country: body.country?.trim() || null,
      city: body.city?.trim() || null,
      website: body.website?.trim() || null,
      birth_year: body.birth_year && body.birth_year > 1850 && body.birth_year < 2030
        ? Math.round(body.birth_year)
        : null,
      practice_summary: (body.practice_summary || "").trim(),
      cv_url: body.cv_url?.trim() || null,
      referred_by: body.referred_by?.trim() || null,
      applicant_role,
      message: body.message?.trim() || null,
      source: body.source?.trim() || "apply_page",
    };

    const { data, error } = await supabase
      .from("invitation_requests")
      .insert(insert)
      .select("id")
      .single();

    if (error) {
      console.error("insert error", { code: error.code, message: error.message });
      return json({ error: "Could not save your application" }, 500);
    }

    try {
      const html = `
<h2>New invitation request</h2>
<p><strong>${esc(full_name)}</strong> &lt;${esc(email)}&gt; — applying as ${esc(applicant_role)}</p>
<table cellpadding="6" style="border-collapse:collapse;font:14px/1.4 sans-serif">
  <tr><td><strong>Location</strong></td><td>${esc([insert.city, insert.country].filter(Boolean).join(", ") || "not given")}</td></tr>
  <tr><td><strong>Born</strong></td><td>${insert.birth_year ?? "not given"}</td></tr>
  <tr><td><strong>Website</strong></td><td>${esc(insert.website || "not given")}</td></tr>
  <tr><td><strong>CV link</strong></td><td>${esc(insert.cv_url || "not given")}</td></tr>
  <tr><td><strong>Referred by</strong></td><td>${esc(insert.referred_by || "not given")}</td></tr>
</table>
<p><strong>Practice</strong><br/>${esc(insert.practice_summary).replace(/\n/g, "<br/>")}</p>
<p><strong>Message</strong><br/>${esc(insert.message || "none").replace(/\n/g, "<br/>")}</p>
<hr/>
<p style="color:#666;font-size:12px">Request ID: ${data.id}</p>`.trim();

      await sendRawEmail({
        to: FOUNDATION_INBOX,
        subject: `Invitation request — ${full_name}`,
        html,
        replyTo: email,
        label: "invitation_request",
        idempotencyKey: `invitation-request-${data.id}`,
      });
    } catch (e) {
      console.error("foundation notification failed", e);
    }

    try {
      const confirmHtml = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
  <h1 style="font-size:22px;margin:0 0 16px">Thank you, ${esc(full_name.split(" ")[0])}.</h1>
  <p style="font-size:15px;line-height:1.55">
    We have received your request for an invitation to the Global Artist Registry.
  </p>
  <p style="font-size:15px;line-height:1.55">
    Each request is read by a person, not a machine. If your application is accepted you will receive an
    invite code by email together with instructions for creating your archive.
  </p>
  <p style="font-size:15px;line-height:1.55">
    Registration is free for life for every ID verified artist, and records are kept in accordance with our
    100 Year Preservation Plan.
  </p>
  <p style="font-size:15px;line-height:1.55;margin-top:24px">
    With thanks,<br/><em>Global Artist Registry Foundation</em>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0"/>
  <p style="font-size:12px;color:#666">
    Global Artist Registry Foundation · Stichting · The Netherlands<br/>globalartistregistry.org
  </p>
</div>`.trim();

      await sendRawEmail({
        to: email,
        subject: "We have received your invitation request",
        html: confirmHtml,
        replyTo: FOUNDATION_INBOX,
        label: "invitation_request_confirmation",
        idempotencyKey: `invitation-request-confirmation-${data.id}`,
      });
    } catch (e) {
      console.error("applicant confirmation failed", e);
    }

    return json({ ok: true, id: data.id });
  } catch (e) {
    console.error("unexpected", e);
    return json({ error: "Unexpected error" }, 500);
  }
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
