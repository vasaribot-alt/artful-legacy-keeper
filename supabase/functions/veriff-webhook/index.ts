import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-auth-client, x-hmac-signature",
};

async function computeHmac(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiSecret = Deno.env.get("VERIFF_API_SECRET");
    if (!apiSecret) {
      console.error("VERIFF_API_SECRET not set");
      return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
    }

    const rawBody = await req.text();

    // Validate HMAC signature
    const signature = req.headers.get("x-hmac-signature");
    if (signature) {
      const computed = await computeHmac(apiSecret, rawBody);
      if (computed.toLowerCase() !== signature.toLowerCase()) {
        console.error("HMAC mismatch");
        return new Response("Invalid signature", { status: 403, headers: corsHeaders });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log("Veriff webhook received:", JSON.stringify(payload));

    const verification = payload.verification;
    if (!verification) {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const status = verification.status;
    const vendorData = verification.vendorData; // This is the user_id we sent

    if (!vendorData) {
      console.error("No vendorData (user_id) in webhook");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Use service role to update profiles
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (status === "approved") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ id_verified: true })
        .eq("user_id", vendorData);

      if (error) {
        console.error("Failed to update profile:", error);
        return new Response("Update failed", { status: 500, headers: corsHeaders });
      }

      console.log(`User ${vendorData} verified successfully`);
    } else {
      console.log(`Verification status for ${vendorData}: ${status}`);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
