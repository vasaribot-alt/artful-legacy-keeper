import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Brevo webhook receiver: records delivery / open / click / bounce / unsubscribe
// events against rows in public.email_send_log.
//
// Configure in Brevo → Transactional → Settings → Webhook with URL:
//   https://<project>.functions.supabase.co/brevo-events?token=<BREVO_WEBHOOK_SECRET>

type BrevoEvent = {
  event?: string;
  email?: string;
  "message-id"?: string;
  message_id?: string;
  subject?: string;
  tag?: string;
  tags?: string[];
  link?: string;
  reason?: string;
  ts_event?: number;
  date?: string;
};

const normalizeId = (value?: string | null) => (value || "").replace(/^<|>$/g, "").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const accepted = [Deno.env.get("BREVO_WEBHOOK_SECRET"), Deno.env.get("BREVO_EVENTS_TOKEN")].filter(Boolean) as string[];
  const token = new URL(req.url).searchParams.get("token");
  if (accepted.length === 0 || !token || !accepted.includes(token)) {
    console.error("brevo-events: rejected request with bad token");
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const backendUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!backendUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Not configured" }), { status: 500 });
  }
  const admin = createClient(backendUrl, serviceKey);

  const payload = await req.json().catch(() => null);
  const events: BrevoEvent[] = Array.isArray(payload) ? payload : payload ? [payload] : [];
  if (events.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let processed = 0;

  for (const ev of events) {
    const event = String(ev.event || "").toLowerCase();
    const email = (ev.email || "").toLowerCase().trim();
    const messageId = normalizeId(ev["message-id"] || ev.message_id);
    const at = ev.ts_event
      ? new Date(ev.ts_event * 1000).toISOString()
      : ev.date
        ? new Date(ev.date).toISOString()
        : new Date().toISOString();

    // Locate the matching send-log row: exact message id first, else latest send to that address.
    let row: { id: string; open_count: number; click_count: number; first_opened_at: string | null; first_clicked_at: string | null } | null = null;

    if (messageId) {
      const { data } = await admin
        .from("email_send_log")
        .select("id, open_count, click_count, first_opened_at, first_clicked_at")
        .or(`message_id.eq.${messageId},message_id.eq.<${messageId}>`)
        .order("created_at", { ascending: false })
        .limit(1);
      row = (data?.[0] as typeof row) || null;
    }
    if (!row && email) {
      const { data } = await admin
        .from("email_send_log")
        .select("id, open_count, click_count, first_opened_at, first_clicked_at")
        .eq("recipient_email", email)
        .order("created_at", { ascending: false })
        .limit(1);
      row = (data?.[0] as typeof row) || null;
    }
    if (!row) {
      console.log(`brevo-events: no matching log row for ${email} (${event})`);
      continue;
    }

    const update: Record<string, unknown> = { last_event: event, last_event_at: at };

    switch (event) {
      case "delivered":
        update.delivered_at = at;
        update.status = "sent";
        break;
      case "opened":
      case "unique_opened":
      case "proxy_open":
        update.open_count = (row.open_count || 0) + 1;
        update.last_opened_at = at;
        if (!row.first_opened_at) update.first_opened_at = at;
        break;
      case "click":
      case "clicked":
        update.click_count = (row.click_count || 0) + 1;
        update.first_clicked_at = row.first_clicked_at || at;
        break;
      case "hard_bounce":
      case "soft_bounce":
      case "blocked":
      case "invalid_email":
      case "deferred":
        update.bounced_at = at;
        update.status = "bounced";
        if (ev.reason) update.error_message = String(ev.reason).slice(0, 500);
        break;
      case "unsubscribed":
      case "spam":
        update.unsubscribed_at = at;
        break;
      default:
        break;
    }

    const { error } = await admin.from("email_send_log").update(update).eq("id", row.id);
    if (error) {
      console.error(`brevo-events: update failed for ${row.id}: ${error.message}`);
      continue;
    }

    if ((event === "unsubscribed" || event === "spam" || event === "hard_bounce") && email) {
      await admin.from("suppressed_emails").insert({
        email,
        reason: event === "hard_bounce" ? "bounce" : event === "spam" ? "complaint" : "unsubscribe",
        metadata: { provider: "brevo", message_id: messageId || null },
      });
    }

    processed++;
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    headers: { "Content-Type": "application/json" },
  });
});
