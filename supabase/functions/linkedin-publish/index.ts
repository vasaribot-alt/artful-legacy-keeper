import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, callerHasRole, getCallerId } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/linkedin";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const callerId = await getCallerId(req);
    if (!callerId) return json({ error: "Not signed in" }, 401);
    if (!(await callerHasRole(callerId, "foundation"))) {
      return json({ error: "Foundation access required" }, 403);
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const linkedinKey = Deno.env.get("LINKEDIN_API_KEY");
    if (!lovableKey || !linkedinKey) {
      return json({ error: "LinkedIn connection is not configured" }, 500);
    }
    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": linkedinKey,
      "Content-Type": "application/json",
    };

    const payload = await req.json().catch(() => ({}));
    const mode: string = payload?.mode ?? "publish";

    // Identity check — also used to resolve the author URN.
    const meRes = await fetch(`${GATEWAY}/v2/userinfo`, { method: "GET", headers });
    const meText = await meRes.text();
    if (!meRes.ok) {
      console.error(`LinkedIn userinfo failed [${meRes.status}]: ${meText}`);
      return json({ error: "LinkedIn rejected the request", status: meRes.status, details: meText }, meRes.status);
    }
    const me = JSON.parse(meText) as { sub?: string; name?: string; email?: string };
    if (mode === "identity") {
      return json({ ok: true, name: me.name ?? null, email: me.email ?? null });
    }
    if (!me.sub) return json({ error: "LinkedIn did not return a member id" }, 502);

    const postId: string | undefined = payload?.post_id;
    if (typeof postId !== "string" || !/^[0-9a-f-]{36}$/i.test(postId)) {
      return json({ error: "A valid post_id is required" }, 400);
    }

    const db = adminClient();
    const { data: post, error: postErr } = await db
      .from("linkedin_posts")
      .select("id, body, link_url, status")
      .eq("id", postId)
      .maybeSingle();
    if (postErr || !post) return json({ error: "Post not found" }, 404);
    if (post.status === "published") return json({ error: "This post is already published" }, 400);
    const text = (post.body || "").trim();
    if (!text) return json({ error: "The post has no text" }, 400);

    const link = (post.link_url || "").trim();
    const body = {
      author: `urn:li:person:${me.sub}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: link ? "ARTICLE" : "NONE",
          ...(link ? { media: [{ status: "READY", originalUrl: link }] } : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await fetch(`${GATEWAY}/v2/ugcPosts`, {
      method: "POST",
      headers: { ...headers, "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify(body),
    });
    const resText = await res.text();
    if (!res.ok) {
      console.error(`LinkedIn post failed [${res.status}]: ${resText}`);
      await db
        .from("linkedin_posts")
        .update({ status: "failed", last_error: `[${res.status}] ${resText}`.slice(0, 2000), updated_at: new Date().toISOString() })
        .eq("id", postId);
      return json({ error: "LinkedIn refused the post", status: res.status, details: resText }, res.status);
    }

    let urn = res.headers.get("x-restli-id") ?? null;
    try {
      const parsed = JSON.parse(resText) as { id?: string };
      urn = parsed?.id ?? urn;
    } catch { /* empty body is fine */ }

    await db
      .from("linkedin_posts")
      .update({
        status: "published",
        post_urn: urn,
        published_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    return json({ ok: true, post_urn: urn });
  } catch (e) {
    console.error("linkedin-publish error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
