// Public endpoint: capture major-gift inquiries (€10K+) from the /support page.
// Inserts a row into major_gift_inquiries and enqueues an email notification to
// the Foundation. No auth required; service-role key is used internally.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const FOUNDATION_INBOX = Deno.env.get("FOUNDATION_INBOX_EMAIL") || "support@globalartistregistry.org";

interface Body {
  full_name?: string;
  email?: string;
  phone?: string;
  organisation?: string;
  country?: string;
  estimated_amount_eur?: number;
  intended_frequency?: string;
  message?: string;
  preferred_contact?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const full_name = (body.full_name || "").trim();
    const email = (body.email || "").trim();

    if (!full_name || full_name.length < 2) return json({ error: "Name is required" }, 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Valid email required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const insert = {
      full_name,
      email,
      phone: body.phone?.trim() || null,
      organisation: body.organisation?.trim() || null,
      country: body.country?.trim() || null,
      estimated_amount_eur:
        body.estimated_amount_eur && body.estimated_amount_eur > 0
          ? Math.round(body.estimated_amount_eur)
          : null,
      intended_frequency: body.intended_frequency || null,
      message: body.message?.trim() || null,
      preferred_contact: body.preferred_contact || "email",
      source: "support_page",
    };

    const { data, error } = await supabase
      .from("major_gift_inquiries")
      .insert(insert)
      .select("id")
      .single();

    if (error) {
      console.error("insert error", error);
      return json({ error: "Could not save inquiry" }, 500);
    }

    // Fire-and-forget notification email to the Foundation inbox
    try {
      const amount = insert.estimated_amount_eur
        ? `€${insert.estimated_amount_eur.toLocaleString("en-US")}`
        : "Not specified";
      const html = `
<h2>New major-gift inquiry</h2>
<p><strong>${escapeHtml(full_name)}</strong> &lt;${escapeHtml(email)}&gt;</p>
<table cellpadding="6" style="border-collapse:collapse;font:14px/1.4 sans-serif">
  <tr><td><strong>Estimated amount</strong></td><td>${amount}</td></tr>
  <tr><td><strong>Frequency</strong></td><td>${escapeHtml(insert.intended_frequency || "—")}</td></tr>
  <tr><td><strong>Phone</strong></td><td>${escapeHtml(insert.phone || "—")}</td></tr>
  <tr><td><strong>Organisation</strong></td><td>${escapeHtml(insert.organisation || "—")}</td></tr>
  <tr><td><strong>Country</strong></td><td>${escapeHtml(insert.country || "—")}</td></tr>
  <tr><td><strong>Preferred contact</strong></td><td>${escapeHtml(insert.preferred_contact || "email")}</td></tr>
</table>
<p><strong>Message</strong><br/>${escapeHtml(insert.message || "—").replace(/\n/g, "<br/>")}</p>
<hr/>
<p style="color:#666;font-size:12px">Inquiry ID: ${data.id}</p>
      `.trim();

      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: FOUNDATION_INBOX,
          subject: `Major-gift inquiry — ${full_name} (${amount})`,
          html,
          reply_to: email,
          tag: "major_gift_inquiry",
        },
      });
    } catch (e) {
      console.error("notification email failed", e);
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
