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

const FREE_MAIL = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com", "outlook.com",
  "live.com", "icloud.com", "me.com", "mac.com", "aol.com", "protonmail.com", "proton.me",
  "gmx.com", "gmx.de", "online.no", "getmail.no", "mail.com", "yandex.com", "web.de", "qq.com",
];

const TLDS_BY_COUNTRY: Record<string, string[]> = {
  norway: ["no"], sweden: ["se"], denmark: ["dk"], germany: ["de"], france: ["fr"],
  netherlands: ["nl"], italy: ["it"], spain: ["es"], poland: ["pl"], austria: ["at"],
  switzerland: ["ch"], belgium: ["be"], finland: ["fi"], "united kingdom": ["co.uk", "uk"],
  ireland: ["ie"], portugal: ["pt"], greece: ["gr"], mexico: ["mx"], brazil: ["com.br"],
};

/** Suggest the AI's best guess at the artist's own site; verified by fetch afterwards. */
async function aiSuggestion(
  name: string,
  city: string,
  country: string,
  apiKey: string,
): Promise<string> {
  const prompt = `What is the personal website address of the visual artist "${name}"${city ? ` based in ${city}` : ""}${country ? `, ${country}` : ""}? Return the artist's own website only, never a gallery, museum, marketplace or social media page. If you do not know, return an empty string.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You return public information about visual artists. You must respond using the provided tool.",
        },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "artist_website",
            description: "Return the artist's own website address",
            parameters: {
              type: "object",
              properties: {
                website: { type: "string", description: "The artist's own website URL, empty if unknown" },
              },
              required: ["website"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "artist_website" } },
    }),
  });

  if (!res.ok) {
    console.error("AI gateway error:", res.status, await res.text());
    if (res.status === 429) throw Object.assign(new Error("Rate limited, please try again shortly."), { status: 429 });
    if (res.status === 402) throw Object.assign(new Error("AI credits exhausted."), { status: 402 });
    return "";
  }

  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return "";
  try {
    return String(JSON.parse(args).website ?? "").trim();
  } catch {
    return "";
  }
}

function asciiName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/å/g, "a")
    .replace(/ß/g, "ss");
}

function candidateDomains(name: string, email: string, country: string): string[] {
  const words = asciiName(name).replace(/[^a-z\s-]/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];

  const emailDomain = (email.split("@")[1] || "").toLowerCase().trim();
  if (emailDomain && !FREE_MAIL.includes(emailDomain)) out.push(emailDomain);

  if (words.length >= 2) {
    const first = words[0];
    const last = words[words.length - 1];
    const stems = [
      `${first}${last}`,
      `${first}-${last}`,
      words.join(""),
      `${first}${words[1]}${last}`.slice(0, 40),
    ];
    const tlds = ["com", ...(TLDS_BY_COUNTRY[country.toLowerCase().trim()] ?? []), "net", "art", "org"];
    for (const stem of [...new Set(stems)]) {
      for (const tld of [...new Set(tlds)]) out.push(`${stem}.${tld}`);
    }
  }

  return [...new Set(out)].slice(0, 16);
}

/** Fetch a candidate and confirm it is really this artist's site. */
async function verify(url: string, name: string): Promise<Findings | null> {
  const target = url.startsWith("http") ? url : `https://${url}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GARF/1.0)" },
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 400_000);
    const flat = asciiName(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    const words = asciiName(name).split(/\s+/).filter((w) => w.length > 2);
    const last = words[words.length - 1];
    const first = words[0];
    if (!last || !flat.includes(last)) return null;
    if (first && first !== last && !flat.includes(first)) return null;

    const lower = html.toLowerCase();
    return {
      website: res.url.replace(/\/$/, ""),
      has_cv: /\b(cv|curriculum|resume|biography|about)\b/.test(lower),
      has_works: /\b(works?|portfolio|paintings?|sculptures?|gallery|projects?)\b/.test(lower),
      has_exhibitions: /\bexhibition|utstilling|ausstellung|expositions?\b/.test(lower),
      notes: "Confirmed by opening the site and matching the artist's name.",
    };
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupWebsite(
  name: string,
  email: string,
  city: string,
  country: string,
  apiKey: string,
): Promise<Findings> {
  const candidates: string[] = [];

  try {
    const suggested = await aiSuggestion(name, city, country, apiKey);
    if (suggested) candidates.push(suggested);
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 429 || status === 402) throw e;
  }

  candidates.push(...candidateDomains(name, email, country));

  for (const candidate of [...new Set(candidates)]) {
    const found = await verify(candidate, name);
    if (found) return found;
  }

  return { ...EMPTY_FINDINGS, notes: "No website of the artist's own could be confirmed." };
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
