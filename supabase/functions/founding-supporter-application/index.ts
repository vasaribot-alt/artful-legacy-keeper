// Public endpoint: capture Founding Supporter applications.
// Inserts a row into founding_supporter_applications, notifies the Foundation,
// and sends a branded thank-you confirmation to the applicant.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendRawEmail } from "../_shared/send-raw-email.ts";

const FOUNDATION_INBOX = Deno.env.get("FOUNDATION_INBOX_EMAIL") || "support@globalartistregistry.org";

const TIER_LABELS: Record<string, { name: string; range: string }> = {
  bronze:   { name: "Bronze Founding Supporter",   range: "€10,000 – €24,999" },
  silver:   { name: "Silver Founding Supporter",   range: "€25,000 – €49,999" },
  gold:     { name: "Gold Founding Supporter",     range: "€50,000 – €99,999" },
  platinum: { name: "Platinum Founding Supporter", range: "€100,000+" },
};

type ApplicantType = "individual" | "foundation" | "corporation";
type Tier = "bronze" | "silver" | "gold" | "platinum";

interface Body {
  applicant_type?: ApplicantType;
  contact_name?: string;
  organization_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  tier?: Tier;
  pledge_amount_eur?: number;
  anonymous_public?: boolean;
  message?: string;
  source?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const contact_name = (body.contact_name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const applicant_type: ApplicantType = ["individual", "foundation", "corporation"].includes(body.applicant_type as string)
      ? (body.applicant_type as ApplicantType)
      : "individual";
    const tier: Tier = ["bronze", "silver", "gold", "platinum"].includes(body.tier as string)
      ? (body.tier as Tier)
      : "bronze";

    if (!contact_name || contact_name.length < 2) return json({ error: "Name is required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Valid email required" }, 400);
    if (applicant_type !== "individual" && !(body.organization_name || "").trim()) {
      return json({ error: "Organisation name is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const insert = {
      applicant_type,
      contact_name,
      organization_name: body.organization_name?.trim() || null,
      email,
      phone: body.phone?.trim() || null,
      country: body.country?.trim() || null,
      tier,
      pledge_amount_eur:
        body.pledge_amount_eur && body.pledge_amount_eur > 0
          ? Math.round(body.pledge_amount_eur)
          : null,
      anonymous_public: !!body.anonymous_public,
      message: body.message?.trim() || null,
      source: body.source?.trim() || "founding_supporter_page",
    };

    const { data, error } = await supabase
      .from("founding_supporter_applications")
      .insert(insert)
      .select("id")
      .single();

    if (error) {
      console.error("insert error", error);
      return json({ error: "Could not save application" }, 500);
    }

    const tierMeta = TIER_LABELS[tier];
    const amount = insert.pledge_amount_eur
      ? `€${insert.pledge_amount_eur.toLocaleString("en-US")}`
      : tierMeta.range;

    // Notify Foundation
    try {
      const html = `
<h2>New Founding Supporter application</h2>
<p><strong>${escapeHtml(contact_name)}</strong> &lt;${escapeHtml(email)}&gt;</p>
<table cellpadding="6" style="border-collapse:collapse;font:14px/1.4 sans-serif">
  <tr><td><strong>Applicant type</strong></td><td>${escapeHtml(applicant_type)}</td></tr>
  <tr><td><strong>Organisation</strong></td><td>${escapeHtml(insert.organization_name || "—")}</td></tr>
  <tr><td><strong>Tier</strong></td><td>${escapeHtml(tierMeta.name)} (${escapeHtml(tierMeta.range)})</td></tr>
  <tr><td><strong>Indicative pledge</strong></td><td>${escapeHtml(amount)}</td></tr>
  <tr><td><strong>Phone</strong></td><td>${escapeHtml(insert.phone || "—")}</td></tr>
  <tr><td><strong>Country</strong></td><td>${escapeHtml(insert.country || "—")}</td></tr>
  <tr><td><strong>Public recognition</strong></td><td>${insert.anonymous_public ? "Prefers anonymity" : "Happy to be recognised"}</td></tr>
</table>
<p><strong>Message</strong><br/>${escapeHtml(insert.message || "—").replace(/\n/g, "<br/>")}</p>
<hr/>
<p style="color:#666;font-size:12px">Application ID: ${data.id}</p>`.trim();

      await sendRawEmail({
        to: FOUNDATION_INBOX,
        subject: `Founding Supporter — ${contact_name} (${tierMeta.name})`,
        html,
        replyTo: email,
        label: "founding_supporter_application",
        idempotencyKey: `founding-supporter-application-${data.id}`,
      });
    } catch (e) {
      console.error("foundation notification failed", e);
    }

    // Applicant confirmation
    try {
      const confirmHtml = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
  <h1 style="font-size:22px;margin:0 0 16px">Thank you, ${escapeHtml(contact_name.split(" ")[0])}.</h1>
  <p style="font-size:15px;line-height:1.55">
    We've received your interest in becoming a <strong>${escapeHtml(tierMeta.name)}</strong> of the
    Global Artist Registry Foundation.
  </p>
  <p style="font-size:15px;line-height:1.55">
    Your application matters. A member of our board will reach out personally within the next few working days
    to answer your questions and share the next steps.
  </p>
  <p style="font-size:15px;line-height:1.55">
    Founding Supporters help us protect the archival record of contemporary art for the next hundred years — a
    mission that only exists because people like you choose to make it real.
  </p>
  <p style="font-size:15px;line-height:1.55;margin-top:24px">
    With gratitude,<br/>
    <em>The GARF Board</em>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0"/>
  <p style="font-size:12px;color:#666">
    Global Artist Registry Foundation · Stichting · The Netherlands<br/>
    globalartistregistry.org
  </p>
</div>`.trim();

      await sendRawEmail({
        to: email,
        subject: "Thank you — Founding Supporter application received",
        html: confirmHtml,
        replyTo: FOUNDATION_INBOX,
        label: "founding_supporter_confirmation",
        idempotencyKey: `founding-supporter-confirmation-${data.id}`,
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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
