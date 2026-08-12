import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { outreachEmailHtml } from "../_shared/email-templates/outreach.ts";

type Letter = {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const SENDER_EMAIL = "outreach@globalartistregistry.org";
const SENDER_NAME_DEFAULT = "Global Artist Registry Foundation";
const CONTACT_LIST_NAME = "GARF Outreach";

// Find (or create) the Brevo list every outreach recipient is added to,
// so Brevo's own statistics and segmentation cover these sends too.
async function resolveOutreachListId(gwHeaders: Record<string, string>): Promise<number | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}/contacts/lists?limit=50&offset=0`, { headers: gwHeaders });
    if (res.ok) {
      const body = await res.json();
      const existing = (body?.lists || []).find((l: { id: number; name: string }) => l.name === CONTACT_LIST_NAME);
      if (existing?.id) return existing.id;
    } else {
      console.error(`Brevo list fetch failed [${res.status}]: ${await res.text()}`);
    }
    const created = await fetch(`${GATEWAY_URL}/contacts/lists`, {
      method: "POST",
      headers: gwHeaders,
      body: JSON.stringify({ name: CONTACT_LIST_NAME, folderId: 1 }),
    });
    if (!created.ok) {
      console.error(`Brevo list create failed [${created.status}]: ${await created.text()}`);
      return null;
    }
    const body = await created.json();
    return body?.id ?? null;
  } catch (e) {
    console.error("Brevo list resolve error:", e instanceof Error ? e.message : e);
    return null;
  }
}

// Upsert the recipient as a Brevo contact so opens/clicks roll up per contact.
async function upsertContact(
  gwHeaders: Record<string, string>,
  listId: number | null,
  email: string,
  name: string | undefined,
  campaignTag: string,
) {
  try {
    const res = await fetch(`${GATEWAY_URL}/contacts`, {
      method: "POST",
      headers: gwHeaders,
      body: JSON.stringify({
        email,
        updateEnabled: true,
        ...(listId ? { listIds: [listId] } : {}),
        attributes: {
          ...(name ? { CONTACT_PERSON: name } : {}),
          CAMPAIGN: campaignTag,
          GAR_STATUS: "contacted",
        },
      }),
    });
    if (!res.ok) {
      console.error(`Brevo contact upsert failed for ${email} [${res.status}]: ${await res.text()}`);
    }
  } catch (e) {
    console.error("Brevo contact upsert error:", e instanceof Error ? e.message : e);
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    const backendUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!authHeader || !backendUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    if (!lovableApiKey || !brevoApiKey) {
      return new Response(JSON.stringify({ error: "Brevo connection not configured. Link the Brevo connector in Settings → Connectors." }), {
        status: 503, headers: jsonHeaders,
      });
    }

    // Verify user + foundation role
    const userClient = createClient(backendUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

    const adminClient = createClient(backendUrl, serviceKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row) => row.role === "foundation")) {
      console.error("Forbidden: user", user.id, "roles", JSON.stringify(roles));
      return new Response(JSON.stringify({ error: "Your account is missing the Foundation role required to send letters." }), {
        status: 403, headers: jsonHeaders,
      });
    }

    const payload = await req.json().catch(() => null);
    console.log("send-outreach-brevo invoked by", user.id);
    const letters = Array.isArray(payload?.letters) ? (payload.letters as Letter[]).slice(0, 60) : [];
    const fromName = typeof payload?.fromName === "string" && payload.fromName.trim()
      ? payload.fromName.trim().slice(0, 120)
      : SENDER_NAME_DEFAULT;
    const campaignTag = typeof payload?.campaignTag === "string" ? payload.campaignTag : "outreach";
    const attachmentDocumentIds: string[] = Array.isArray(payload?.attachmentDocumentIds)
      ? (payload.attachmentDocumentIds as unknown[])
        .filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))
        .slice(0, 3)
      : [];

    if (letters.length === 0) {
      return new Response(JSON.stringify({ error: "No letters supplied" }), { status: 400, headers: jsonHeaders });
    }
    const invalid = letters.find((l) => !l?.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.to) || !l?.bodyHtml);
    if (invalid) {
      return new Response(JSON.stringify({ error: `Invalid letter for "${invalid?.to || "unknown recipient"}"` }), {
        status: 400, headers: jsonHeaders,
      });
    }

    // Build attachments once for the whole batch (Brevo wants base64 content).
    const attachment: { name: string; content: string }[] = [];
    if (attachmentDocumentIds.length > 0) {
      const { data: docs, error: docsError } = await adminClient
        .from("foundation_documents")
        .select("id, file_name, file_path, file_size")
        .in("id", attachmentDocumentIds);
      if (docsError) {
        return new Response(JSON.stringify({ error: `Could not read attachments: ${docsError.message}` }), {
          status: 400, headers: jsonHeaders,
        });
      }
      let totalBytes = 0;
      for (const doc of docs || []) {
        const { data: file, error: dlError } = await adminClient.storage
          .from("foundation-documents")
          .download(doc.file_path);
        if (dlError || !file) {
          return new Response(JSON.stringify({ error: `Could not download attachment "${doc.file_name}"` }), {
            status: 400, headers: jsonHeaders,
          });
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        totalBytes += bytes.byteLength;
        if (totalBytes > 6 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: "Attachments exceed the 6 MB limit for email sending." }), {
            status: 400, headers: jsonHeaders,
          });
        }
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        attachment.push({ name: doc.file_name, content: btoa(binary) });
      }
      console.log(`Attaching ${attachment.length} file(s), ${totalBytes} bytes total`);
    }

    const sent: string[] = [];
    const failures: { to: string; error: string }[] = [];

    for (const letter of letters) {
      try {
        const brandedHtml = outreachEmailHtml(letter.bodyHtml);
        const res = await fetch(`${GATEWAY_URL}/smtp/email`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "X-Connection-Api-Key": brevoApiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: fromName, email: SENDER_EMAIL },
            to: [{ email: letter.to, name: letter.toName || undefined }],
            subject: letter.subject || "",
            htmlContent: brandedHtml,
            ...(letter.bodyText ? { textContent: letter.bodyText } : {}),
            ...(attachment.length > 0 ? { attachment } : {}),
            tags: [campaignTag],
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.error(`Brevo send failed for ${letter.to} [${res.status}]: ${errBody}`);
          failures.push({ to: letter.to, error: `Brevo API ${res.status}: ${errBody.slice(0, 200)}` });
          await adminClient.from("email_send_log").insert({
            message_id: `${campaignTag}-${letter.to}-${Date.now()}`,
            template_name: campaignTag,
            recipient_email: letter.to,
            status: "failed",
            error_message: `Brevo API ${res.status}: ${errBody.slice(0, 500)}`,
            metadata: {
              subject: letter.subject || "",
              recipient_name: letter.toName || null,
              from_name: fromName,
              from_email: SENDER_EMAIL,
              attachments: attachment.map((a) => a.name),
              body_html: letter.bodyHtml.slice(0, 20000),
              sent_by: user.id,
              provider: "brevo",
            },
          });
          continue;
        }

        const result = await res.json();
        console.log(`Brevo send OK for ${letter.to}: messageId=${result?.messageId}`);
        sent.push(letter.to);
        await adminClient.from("email_send_log").insert({
          message_id: String(result?.messageId || `${campaignTag}-${letter.to}-${Date.now()}`),
          template_name: campaignTag,
          recipient_email: letter.to,
          status: "sent",
          metadata: {
            subject: letter.subject || "",
            recipient_name: letter.toName || null,
            from_name: fromName,
            from_email: SENDER_EMAIL,
            attachments: attachment.map((a) => a.name),
            body_html: letter.bodyHtml.slice(0, 20000),
            sent_by: user.id,
            provider: "brevo",
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Send failed";
        console.error("Brevo send error for", letter.to, msg);
        failures.push({ to: letter.to, error: msg });
        await adminClient.from("email_send_log").insert({
          message_id: `${campaignTag}-${letter.to}-${Date.now()}`,
          template_name: campaignTag,
          recipient_email: letter.to,
          status: "failed",
          error_message: msg.slice(0, 500),
          metadata: { subject: letter.subject || "", provider: "brevo", sent_by: user.id },
        });
      }

    }

    return new Response(
      JSON.stringify({
        success: failures.length === 0,
        sent: sent.length,
        recipients: sent,
        from: SENDER_EMAIL,
        provider: "brevo",
        failures,
      }),
      { status: sent.length > 0 ? 200 : 502, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
