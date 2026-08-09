import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";

type Contact = {
  email: string;
  attributes: Record<string, string>;
};

const CUSTOM_ATTRIBUTES = [
  { name: "ORGANIZATION", label: "Organization" },
  { name: "COUNTRY", label: "Country" },
  { name: "CITY", label: "City" },
  { name: "WEBSITE", label: "Website" },
  { name: "CATEGORY", label: "Category" },
  { name: "CONTACT_PERSON", label: "Contact Person" },
  { name: "PHONE", label: "Phone" },
  { name: "GAR_STATUS", label: "GAR Status" },
  { name: "CAMPAIGN", label: "Campaign" },
];

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
      return new Response(JSON.stringify({ error: "Brevo connection not configured" }), { status: 503, headers: jsonHeaders });
    }

    // Verify user + foundation role
    const userClient = createClient(backendUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

    const adminClient = createClient(backendUrl, serviceKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row) => row.role === "foundation")) {
      return new Response(JSON.stringify({ error: "Foundation role required" }), { status: 403, headers: jsonHeaders });
    }

    const { source } = await req.json().catch(() => ({}));
    if (source !== "galleries" && source !== "alliance") {
      return new Response(JSON.stringify({ error: "source must be 'galleries' or 'alliance'" }), { status: 400, headers: jsonHeaders });
    }

    const gwHeaders = {
      "Authorization": `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": brevoApiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    // 1. Ensure custom attributes exist (ignore if already present)
    for (const attr of CUSTOM_ATTRIBUTES) {
      try {
        const res = await fetch(`${GATEWAY_URL}/contacts/attributes/normal/${attr.name}`, {
          method: "POST",
          headers: gwHeaders,
          body: JSON.stringify({ type: "normal", data_type: "text", label: attr.label }),
        });
        if (!res.ok && res.status !== 400) {
          // 400 = already exists, which is fine
          console.error(`Attribute create ${attr.name}: ${res.status} ${await res.text()}`);
        }
      } catch (e) {
        // ignore — attribute may already exist
      }
    }

    // 2. Create or find a contact list
    const listName = source === "galleries" ? "GARF Gallery Outreach" : "GARF Alliance Outreach";
    let listId: number | null = null;

    // Try to find existing list by fetching all lists
    try {
      const listsRes = await fetch(`${GATEWAY_URL}/contacts/lists?limit=50&sort=desc`, { headers: gwHeaders });
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        const existing = (listsData?.lists || []).find((l: any) => l.name === listName);
        if (existing) listId = existing.id;
      }
    } catch (e) { /* continue to create */ }

    if (!listId) {
      try {
        const createRes = await fetch(`${GATEWAY_URL}/contacts/lists`, {
          method: "POST",
          headers: gwHeaders,
          body: JSON.stringify({ name: listName, folderId: 1 }),
        });
        if (createRes.ok) {
          const created = await createRes.json();
          listId = created?.listId ?? created?.id;
        } else {
          const errBody = await createRes.text();
          console.error("List create failed:", createRes.status, errBody);
        }
      } catch (e) {
        console.error("List create error:", e);
      }
    }

    console.log(`Using Brevo list "${listName}" id=${listId}`);

    // 3. Fetch contacts from DB
    const contacts: Contact[] = [];

    if (source === "galleries") {
      const { data: galleries } = await adminClient
        .from("galleries")
        .select("name, email, city, country, website, phone, contact_name")
        .not("email", "is", null)
        .limit(1000);

      const { data: outreachRows } = await adminClient
        .from("gallery_outreach")
        .select("gallery_id, status, campaign_tag")
        .limit(1000);

      // Map gallery_id → outreach status
      const statusMap = new Map<string, { status: string; campaign: string }>();
      for (const o of outreachRows || []) {
        statusMap.set(o.gallery_id, { status: o.status, campaign: o.campaign_tag || "" });
      }

      // We need gallery id for mapping, re-fetch with id
      const { data: galleriesWithId } = await adminClient
        .from("galleries")
        .select("id, name, email, city, country, website, phone, contact_name")
        .not("email", "is", null)
        .limit(1000);

      for (const g of galleriesWithId || []) {
        if (!g.email) continue;
        const o = statusMap.get(g.id);
        contacts.push({
          email: g.email,
          attributes: {
            ORGANIZATION: g.name || "",
            CITY: g.city || "",
            COUNTRY: g.country || "",
            WEBSITE: g.website || "",
            CONTACT_PERSON: g.contact_name || "",
            PHONE: g.phone || "",
            GAR_STATUS: o?.status || "not_contacted",
            CAMPAIGN: o?.campaign || "",
            ...(listId ? { GALLERY_ID: g.id } : {}),
          },
        });
      }
    } else {
      const { data: targets } = await adminClient
        .from("alliance_outreach_targets")
        .select("name, country, category, website, contact_email, contact_person, status, tag")
        .not("contact_email", "is", null)
        .limit(1000);

      for (const t of targets || []) {
        if (!t.contact_email) continue;
        contacts.push({
          email: t.contact_email,
          attributes: {
            ORGANIZATION: t.name || "",
            COUNTRY: t.country || "",
            CATEGORY: t.category || "",
            WEBSITE: t.website || "",
            CONTACT_PERSON: t.contact_person || "",
            GAR_STATUS: t.status || "to_contact",
            CAMPAIGN: t.tag || "",
          },
        });
      }
    }

    console.log(`Found ${contacts.length} contacts to sync from ${source}`);

    if (contacts.length === 0) {
      return new Response(JSON.stringify({ error: "No contacts with email addresses found" }), {
        status: 400, headers: jsonHeaders,
      });
    }

    // 4. Upsert contacts in batches of 20
    let synced = 0;
    const failures: { email: string; error: string }[] = [];
    const BATCH = 20;

    for (let i = 0; i < contacts.length; i += BATCH) {
      const batch = contacts.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (c) => {
          const res = await fetch(`${GATEWAY_URL}/contacts`, {
            method: "POST",
            headers: gwHeaders,
            body: JSON.stringify({
              email: c.email,
              attributes: c.attributes,
              listIds: listId ? [listId] : [],
              updateEnabled: true,
            }),
          });
          if (!res.ok) {
            const body = await res.text();
            // 400 "already exists" is acceptable for a no-op update
            if (res.status === 400 && body.includes("already exist")) return;
            throw new Error(`${res.status}: ${body.slice(0, 150)}`);
          }
        }),
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === "fulfilled") {
          synced++;
        } else {
          failures.push({ email: batch[j].email, error: r.reason?.message || "Unknown error" });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: failures.length === 0,
        source,
        listName,
        listId,
        totalContacts: contacts.length,
        synced,
        failures: failures.slice(0, 20),
        provider: "brevo",
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
