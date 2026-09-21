import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, callerHasRole, getCallerId } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE = "https://globalartistregistry.org";

interface Findings {
  website: string;
  has_cv: boolean;
  has_works: boolean;
  has_exhibitions: boolean;
  notes: string;
}

const EMPTY_FINDINGS: Findings = {
  website: "",
  has_cv: false,
  has_works: false,
  has_exhibitions: false,
  notes: "",
};

async function lookupWebsite(
  name: string,
  email: string,
  city: string,
  country: string,
  apiKey: string,
): Promise<Findings> {
  const prompt = `Find the personal artist website of the visual artist "${name}"${city ? ` based in ${city}` : ""}${country ? `, ${country}` : ""} (registered email address: ${email}). Return the artist's own website only, never a gallery, museum, marketplace or social media page. Say whether that website appears to contain a CV page, a works or portfolio page, and an exhibitions list. Use an empty string and false for anything you are not confident about.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant returning verified public information about visual artists. You must respond using the provided tool.",
        },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "artist_website",
            description: "Return the artist's own website and what it contains",
            parameters: {
              type: "object",
              properties: {
                website: { type: "string", description: "The artist's own website URL, empty if unknown" },
                has_cv: { type: "boolean", description: "True when the site has a CV or biography page" },
                has_works: { type: "boolean", description: "True when the site shows works or a portfolio" },
                has_exhibitions: { type: "boolean", description: "True when the site lists exhibitions" },
                notes: { type: "string", description: "One short factual sentence about the site, empty if unknown" },
              },
              required: ["website", "has_cv", "has_works", "has_exhibitions", "notes"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "artist_website" } },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("AI gateway error:", res.status, body);
    if (res.status === 429) throw Object.assign(new Error("Rate limited, please try again shortly."), { status: 429 });
    if (res.status === 402) throw Object.assign(new Error("AI credits exhausted."), { status: 402 });
    throw new Error("AI gateway error");
  }

  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { ...EMPTY_FINDINGS };
  const parsed = JSON.parse(args);
  return {
    website: String(parsed.website ?? "").trim(),
    has_cv: !!parsed.has_cv,
    has_works: !!parsed.has_works,
    has_exhibitions: !!parsed.has_exhibitions,
    notes: String(parsed.notes ?? "").trim(),
  };
}

function slugFor(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ø/g, "o")
      .replace(/æ/g, "ae")
      .replace(/å/g, "a")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "your-name"
  );
}

function compose(name: string, findings: Findings) {
  const first = (name || "").trim().split(/\s+/)[0] || "friend";
  const site = findings.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const slug = slugFor(name);

  const parts: string[] = [];
  parts.push(`Dear ${first},`);
  parts.push(
    "Welcome to the Global Artist Registry, and thank you for registering. I wanted to write personally, and to point out a few things that may save you time.",
  );

  if (site) {
    parts.push(
      `I found your website, ${site}. There is a shortcut for filling in your archive: in your dashboard you will find a page called Research. Paste your website address there, and it will gather your biography${findings.has_cv ? ", CV" : ""}${findings.has_works ? " and works" : ""} into a review list. You accept the items you want, and nothing is added to your archive without your approval.`,
    );
  } else {
    parts.push(
      "If you have a website, or pages with your works and exhibition history anywhere online, there is a shortcut for filling in your archive: in your dashboard you will find a page called Research. Paste the address there, and it will gather your biography, CV and works into a review list that you approve item by item. If your material is not online, simply reply to this message and I will gladly help you enter your CV and works myself.",
    );
  }

  parts.push(
    `You can also have your own public website through the registry, at ${SITE}/site/${slug}. You switch it on from your dashboard and you decide what it shows: the works you choose, your CV, your exhibitions, your publications and how people may contact you.`,
  );

  if (site) {
    parts.push(
      `Since you already have a domain of your own, you can point it at that website, so your own address serves your registry pages. We will send you the exact settings and help you through it whenever you wish.`,
    );
  } else {
    parts.push(
      "If you do not have a domain of your own, the registry address above is yours at no cost. And if you later register your own domain, you can point it at your registry website and we will help you set it up.",
    );
  }

  parts.push(
    "One more thing that matters over a long life of work: you can name in advance who inherits your archive. Nothing changes while you are alive. When the time comes, the foundation confirms the handover, the person you named receives full management of the record, and your estate is shown publicly as its custodian. It is the reason the registry exists: the work should still be documented long after all of us.",
  );

  parts.push(
    "If anything is unclear, or you would simply rather have a hand with it, reply to this message and I will help you personally.",
  );
  parts.push("Warm regards,\nJan S. Kindem\nGlobal Artist Registry Foundation\nglobalartistregistry.org");

  return {
    subject: "Welcome to the Global Artist Registry, and a shortcut to getting started",
    body: parts.join("\n\n"),
  };
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

    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const admin = adminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email, city, country, website")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Artist not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let findings: Findings;
    const known = (profile.website ?? "").trim();
    if (known) {
      findings = { ...EMPTY_FINDINGS, website: known, notes: "Website already on the artist's profile." };
    } else {
      findings = await lookupWebsite(
        profile.full_name ?? "",
        profile.email ?? "",
        profile.city ?? "",
        profile.country ?? "",
        apiKey,
      );
    }

    const { subject, body } = compose(profile.full_name ?? "", findings);

    const { error } = await admin
      .from("welcome_letters")
      .upsert(
        {
          user_id,
          status: "drafted",
          discovered_website: findings.website || null,
          website_findings: findings,
          subject,
          body,
          drafted_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) throw error;

    return new Response(JSON.stringify({ subject, body, findings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    console.error("prepare-welcome-letter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
