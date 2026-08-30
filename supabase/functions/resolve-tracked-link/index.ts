import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

function deviceFromUa(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet/.test(s)) return "tablet";
  if (/mobi|iphone|android/.test(s)) return "mobile";
  if (/bot|crawler|spider|preview|facebookexternalhit|slackbot|whatsapp/.test(s)) return "bot";
  return "desktop";
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const url = new URL(req.url);
    let code = url.searchParams.get("code");
    if (!code && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      code = typeof body?.code === "string" ? body.code : null;
    }
    if (!code || !/^[A-Za-z0-9]{4,16}$/.test(code)) {
      return json({ error: "Invalid link code" }, 400);
    }

    const ua = req.headers.get("user-agent") ?? "";
    const device = deviceFromUa(ua);
    const country =
      req.headers.get("cf-ipcountry") ??
      req.headers.get("x-vercel-ip-country") ??
      null;
    const referrer = req.headers.get("referer");
    const ip =
      req.headers.get("cf-connecting-ip") ??
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const visitorHash = ip || ua ? (await sha256(`${code}:${ip}:${ua}`)).slice(0, 64) : null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin.rpc("record_tracked_link_click", {
      _code: code,
      _country: country,
      _device: device,
      _referrer: referrer,
      _visitor_hash: visitorHash,
    });

    if (error) {
      console.error(`record_tracked_link_click failed: ${error.message}`);
      return json({ error: "Could not resolve link", details: error.message }, 500);
    }
    if (!data) {
      return json({ error: "Unknown link" }, 404);
    }

    return json({ destination: data as string });
  } catch (err) {
    console.error("resolve-tracked-link error", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
