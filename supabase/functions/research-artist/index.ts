import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

const MAX_PAGES = 16;
const PAGE_CHARS = 30000;
const BATCH = 4;

/** Schema used once per page, so nothing gets squeezed out by a single global answer. */
const pageSchema = {
  name: "page_extraction",
  description: "Everything documented about the named artist on this one page",
  parameters: {
    type: "object",
    properties: {
      is_about_artist: {
        type: "boolean",
        description: "True only when this page clearly concerns the named artist",
      },
      profile_facts: {
        type: "array",
        description: "Discrete profile facts stated on this page, one entry per fact",
        items: {
          type: "object",
          properties: {
            field: {
              type: "string",
              description:
                "One of: biography, chronology, birth_year, birth_city, birth_country, city, country, nationality, website, gallery, social_link",
            },
            value: { type: "string", description: "The value exactly as documented" },
            quote: { type: "string", description: "The sentence or line on the page that states it" },
          },
          required: ["field", "value", "quote"],
          additionalProperties: false,
        },
      },
      cv_entries: {
        type: "array",
        description: "Every exhibition, award, grant, collection, education, residency, publication or press line on this page",
        items: {
          type: "object",
          properties: {
            section: {
              type: "string",
              description:
                "One of: solo_exhibitions, group_exhibitions, awards, grants, collections, education, residencies, publications, bibliography",
            },
            year: { type: ["string", "null"] },
            text: {
              type: "string",
              description: "The line, e.g. 'Galerie X, Berlin' or 'Title, Publisher, 2019'",
            },
          },
          required: ["section", "text"],
          additionalProperties: false,
        },
      },
      artworks: {
        type: "array",
        description: "Every individual work listed on this page, one entry per work, including works in checklists and captions",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            year: { type: ["integer", "null"] },
            medium: { type: ["string", "null"] },
            height_cm: { type: ["number", "null"] },
            width_cm: { type: ["number", "null"] },
            depth_cm: { type: ["number", "null"] },
            dimensions_text: { type: ["string", "null"], description: "Dimensions exactly as printed" },
            edition: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            image_url: { type: ["string", "null"], description: "Absolute URL of the image shown with this work, if any" },
          },
          required: ["title"],
          additionalProperties: false,
        },
      },
      images: {
        type: "array",
        description: "Absolute image URLs on this page worth keeping, with their caption",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            caption: { type: ["string", "null"] },
            category: { type: "string", description: "One of: artwork, installation, portrait, document, other" },
          },
          required: ["url"],
          additionalProperties: false,
        },
      },
    },
    required: ["is_about_artist", "profile_facts", "cv_entries", "artworks", "images"],
    additionalProperties: false,
  },
};

interface Page {
  url: string;
  markdown: string;
  links: string[];
  images: string[];
}

/** Reads a page without Firecrawl: plain fetch, then HTML reduced to text, links and images. */
async function plainScrape(url: string): Promise<Page | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GARF-Research/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!/html|text/i.test(type)) return null;
    const html = await res.text();

    const abs = (u: string) => {
      try {
        return new URL(u, url).toString();
      } catch {
        return "";
      }
    };

    const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi))
      .map((m) => abs(m[1]))
      .filter(Boolean);

    const images = Array.from(
      html.matchAll(/<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["']/gi),
    )
      .map((m) => abs(m[1]))
      .filter((u) => /^https?:\/\//i.test(u) && !/\.svg($|\?)/i.test(u));

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&#39;|&rsquo;/gi, "'")
      .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (text.length < 200) return null;
    return {
      url,
      markdown: text.slice(0, PAGE_CHARS),
      links: Array.from(new Set(links)),
      images: Array.from(new Set(images)).slice(0, 120),
    };
  } catch (_e) {
    return null;
  }
}

async function scrape(url: string): Promise<Page | null> {
  if (!FIRECRAWL_API_KEY) return await plainScrape(url);
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true, waitFor: 1200 }),
    });
    if (!res.ok) return await plainScrape(url);
    const d = await res.json();
    const doc = d?.data ?? d;
    const markdown: string = String(doc?.markdown || "");
    if (!markdown.trim()) return await plainScrape(url);
    const links: string[] = Array.isArray(doc?.links) ? doc.links.filter((l: unknown) => typeof l === "string") : [];
    const images = Array.from(markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g)).map((m) => m[1]);
    return { url, markdown: markdown.slice(0, PAGE_CHARS), links, images: Array.from(new Set(images)).slice(0, 120) };
  } catch (_e) {
    return await plainScrape(url);
  }
}


async function search(query: string): Promise<string[]> {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 8 }),
    });
    if (!res.ok) return [];
    const d = await res.json();
    const rows = d?.data ?? d?.web ?? [];
    return (Array.isArray(rows) ? rows : []).map((r: { url?: string }) => r?.url).filter(Boolean) as string[];
  } catch (_e) {
    return [];
  }
}

const RELEVANT = /(work|artwork|exhibition|show|press|publication|book|catalog|catalogue|news|bio|about|cv|text|essay|project|selected)/i;
const SKIP = /(\.(jpg|jpeg|png|gif|webp|svg|css|js|zip)$|mailto:|tel:|\/cart|\/checkout|instagram\.com|facebook\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com|\/privacy|\/terms|\/shop)/i;

function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).host === new URL(b).host;
  } catch {
    return false;
  }
}

function nameSlugs(name: string): string[] {
  const parts = name.toLowerCase().split(/\s+/).filter(Boolean);
  return [parts.join("-"), parts.join("_"), parts.join(""), parts[parts.length - 1] || ""].filter(Boolean);
}

async function extractPage(page: Page, artistName: string): Promise<Record<string, unknown> | null> {
  const prompt = `Artist being researched: "${artistName}".
Page URL: ${page.url}

Image URLs present on this page (use these exact strings when referencing images):
${page.images.slice(0, 60).join("\n") || "none detected"}

PAGE CONTENT (markdown):
${page.markdown}

Extraction rules, follow them strictly:
1. Extract ONLY what is written in the page content above. If a fact is not on this page, leave it out. Never fill a gap from general knowledge, and never guess a year, dimension, medium, city or title.
2. Do not merge different facts. Birth place and current place of residence are separate: "Born 1979 in Moss, lives in Drøbak" gives birth_city = Moss and city = Drøbak.
3. List every single work you can see, including works inside exhibition checklists, image captions and index listings. Do not summarise or select "the important ones".
4. Dimensions: keep the printed text in dimensions_text and convert to centimetres for the numeric fields (1 inch = 2.54 cm). Leave numbers null when not printed.
5. Put publications and books in cv_entries with section "publications", press and reviews under "bibliography".
6. Attach the image shown next to a work as that work's image_url, using an exact URL from the list above.
7. Every profile fact needs the quote from the page that states it. No quote means no fact.
8. Images: list only images the page presents as this artist's work, an installation view of their exhibition, a portrait of them, or a document about them. Leave out logos, interface graphics, adverts, other artists' works, and any image whose subject the page does not state. When in doubt, leave it out.
9. If this page is not about the named artist, set is_about_artist to false and return empty lists.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.7-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an archivist transcribing a single web page into structured records. You transcribe, you never infer, never complete and never embellish. Missing data stays missing.",
        },
        { role: "user", content: prompt },
      ],
      tools: [{ type: "function", function: pageSchema }],
      tool_choice: { type: "function", function: { name: "page_extraction" } },
    }),
  });
  if (!res.ok) {
    console.error("page extraction failed", page.url, res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  try {
    return JSON.parse(call.function.arguments);
  } catch {
    return null;
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Site furniture, tracking pixels and interface assets that are never artist material. */
const IMAGE_JUNK =
  /(logo|favicon|sprite|icon|avatar|placeholder|spacer|pixel|tracking|banner|arrow|button|badge|cursor|pattern|newsletter|footer|header|menu|nav|social|share|instagram|facebook|twitter|wordpress|woocommerce|gravatar|emoji|captcha|loader|spinner|blank|default|1x1|transparent)/i;

/** Tiny renditions named in the URL, e.g. -150x150, _thumb, w=80. */
const IMAGE_TOO_SMALL = /(?:[-_])(\d{1,3})x(\d{1,3})(?:[-_.]|$)|(?:thumb|thumbnail|small|mini|tiny|preview)\b|[?&](?:w|width|h|height)=([1-9]?\d|1\d\d)(?:&|$)/i;

function usableImage(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  const path = url.split("?")[0];
  if (!/\.(jpe?g|png|webp|tiff?|avif)$/i.test(path) && !/\/(image|media|photo)/i.test(path)) return false;
  if (IMAGE_JUNK.test(url)) return false;
  const m = url.match(/(?:[-_])(\d{2,4})x(\d{2,4})(?:[-_.]|$)/);
  if (m && (parseInt(m[1], 10) < 400 || parseInt(m[2], 10) < 400)) return false;
  if (IMAGE_TOO_SMALL.test(url)) return false;
  return true;
}

/** A page that plausibly documents this artist's work, used before keeping uncaptioned images. */
function pageIsArtistMaterial(pageUrl: string, slugs: string[]): boolean {
  const lower = pageUrl.toLowerCase();
  if (slugs.some((s) => s.length > 3 && lower.includes(s))) return true;
  return /(work|artwork|exhibition|show|installation|press|catalog|catalogue|project|selected)/i.test(lower);
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let runId: string | null = null;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured" }, 500);
    // Firecrawl is optional: without it the function reads pages with a plain fetch

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const ownerId: string = body.owner_id || user.id;
    const seedUrls: string[] = Array.isArray(body.urls)
      ? body.urls.map((u: string) => String(u).trim()).filter(Boolean).slice(0, 8)
      : [];
    const hints: string | undefined = body.hints ? String(body.hints).slice(0, 800) : undefined;

    if (ownerId !== user.id) {
      const { data: allowed } = await admin.rpc("has_registrar_access", {
        _registrar_id: user.id,
        _owner_id: ownerId,
      });
      if (!allowed) return json({ error: "Forbidden" }, 403);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, website")
      .eq("user_id", ownerId)
      .maybeSingle();
    if (!profile) return json({ error: "Profile not found" }, 404);
    if (!profile.full_name) {
      return json({ error: "Add the artist's full name first so the research targets the right person." }, 400);
    }
    const artistName = profile.full_name;

    const { data: run, error: runErr } = await admin
      .from("research_runs")
      .insert({
        owner_id: ownerId,
        created_by: user.id,
        artist_name: artistName,
        seed_urls: seedUrls,
        hints: hints ?? null,
        status: "running",
      })
      .select("id")
      .single();
    if (runErr || !run) return json({ error: runErr?.message || "Could not start research" }, 500);
    runId = run.id;

    // ---- Stage 1: decide which pages to read -------------------------------
    const queue: string[] = [];
    const seen = new Set<string>();
    const push = (u: string) => {
      const clean = u.split("#")[0].replace(/\/$/, "");
      if (!/^https?:\/\//i.test(clean) || SKIP.test(clean) || seen.has(clean)) return;
      seen.add(clean);
      queue.push(clean);
    };
    seedUrls.forEach(push);
    if (profile.website) push(profile.website);
    if (!queue.length) {
      const found = await search(`"${artistName}" artist exhibitions works`);
      found.slice(0, 4).forEach(push);
    }

    const slugs = nameSlugs(artistName);
    const pages: Page[] = [];
    const failed: string[] = [];

    // read the seeds first, then follow their relevant subpages
    const seedPages: Page[] = [];
    for (const url of queue.slice(0, 6)) {
      const p = await scrape(url);
      if (p) {
        seedPages.push(p);
        pages.push(p);
      } else {
        failed.push(url);
      }
    }

    const followUps: string[] = [];
    for (const p of seedPages) {
      for (const link of p.links) {
        const clean = link.split("#")[0].replace(/\/$/, "");
        if (!/^https?:\/\//i.test(clean) || SKIP.test(clean) || seen.has(clean)) continue;
        if (!sameHost(clean, p.url)) continue;
        const lower = clean.toLowerCase();
        const nameMatch = slugs.some((s) => s.length > 3 && lower.includes(s));
        if (!nameMatch && !RELEVANT.test(lower)) continue;
        seen.add(clean);
        followUps.push(clean);
      }
    }

    const room = Math.max(0, MAX_PAGES - pages.length);
    for (let i = 0; i < followUps.slice(0, room).length; i += BATCH) {
      const slice = followUps.slice(0, room).slice(i, i + BATCH);
      const results = await Promise.all(slice.map((u) => scrape(u)));
      results.forEach((p, idx) => (p ? pages.push(p) : failed.push(slice[idx])));
    }

    if (!pages.length) {
      await admin.from("research_runs").update({
        status: "failed",
        error: "None of the given pages could be read",
        completed_at: new Date().toISOString(),
      }).eq("id", runId);
      return json({ error: "None of the given pages could be read. Check the addresses and try again." }, 400);
    }

    // ---- Stage 2: extract each page on its own ----------------------------
    const extractions: { page: Page; result: Record<string, unknown> }[] = [];
    for (let i = 0; i < pages.length; i += BATCH) {
      const slice = pages.slice(i, i + BATCH);
      const results = await Promise.all(slice.map((p) => extractPage(p, artistName)));
      results.forEach((r, idx) => {
        if (r && r.is_about_artist !== false) extractions.push({ page: slice[idx], result: r });
      });
    }

    // ---- Stage 3: merge, dedupe, stage as findings ------------------------
    type Finding = Record<string, unknown>;
    const findings: Finding[] = [];
    const base = { run_id: runId, owner_id: ownerId };

    const FIELD_LABELS: Record<string, string> = {
      biography: "Biography",
      chronology: "Chronology",
      birth_year: "Year of birth",
      birth_city: "Place of birth",
      birth_country: "Country of birth",
      city: "Lives and works in (city)",
      country: "Lives and works in (country)",
      nationality: "Nationality",
      website: "Website",
      gallery: "Gallery",
      social_link: "Social media link",
    };

    // group profile facts by field + value so repeated statements raise confidence
    const factGroups = new Map<string, { field: string; value: string; quote: string; urls: string[] }>();
    for (const { page, result } of extractions) {
      for (const f of (result.profile_facts as Record<string, string>[] | undefined) || []) {
        if (!f?.field || !f?.value || !f?.quote) continue;
        if (!(f.field in FIELD_LABELS)) continue;
        const key = `${f.field}::${norm(f.value)}`;
        const existing = factGroups.get(key);
        if (existing) {
          if (!existing.urls.includes(page.url)) existing.urls.push(page.url);
        } else {
          factGroups.set(key, { field: f.field, value: f.value, quote: f.quote, urls: [page.url] });
        }
      }
    }
    // note where sources disagree instead of silently choosing one
    const perField = new Map<string, number>();
    for (const g of factGroups.values()) perField.set(g.field, (perField.get(g.field) || 0) + 1);

    for (const g of factGroups.values()) {
      const contested = (perField.get(g.field) || 0) > 1;
      findings.push({
        ...base,
        kind: "profile_field",
        field: g.field === "gallery" ? "galleries" : g.field === "social_link" ? "social_links" : g.field,
        label: contested
          ? `${FIELD_LABELS[g.field]} (one of several values found)`
          : FIELD_LABELS[g.field],
        value: g.value,
        source_url: g.urls[0],
        confidence: g.urls.length > 1 ? "high" : contested ? "low" : "medium",
        payload: {
          value: g.field === "birth_year" ? parseInt(g.value, 10) || null : g.value,
          galleries: g.field === "gallery" ? [g.value] : undefined,
          social_links: g.field === "social_link" ? { link: g.value } : undefined,
          quote: g.quote,
          sources: g.urls,
        },
      });
    }

    const cvSeen = new Set<string>();
    for (const { page, result } of extractions) {
      for (const e of (result.cv_entries as Record<string, string>[] | undefined) || []) {
        if (!e?.text) continue;
        const key = `${e.year || ""}::${norm(e.text)}`;
        if (cvSeen.has(key)) continue;
        cvSeen.add(key);
        findings.push({
          ...base,
          kind: "cv_entry",
          field: e.section || "group_exhibitions",
          label: e.year ? `${e.year} · ${e.text}` : e.text,
          value: e.text,
          source_url: page.url,
          confidence: "medium",
          payload: { section: e.section, year: e.year ?? null, text: e.text },
        });
      }
    }

    const artSeen = new Set<string>();
    for (const { page, result } of extractions) {
      for (const a of (result.artworks as Record<string, unknown>[] | undefined) || []) {
        const title = typeof a?.title === "string" ? a.title : "";
        if (!title.trim()) continue;
        const key = `${norm(title)}::${a.year ?? ""}`;
        if (artSeen.has(key)) continue;
        artSeen.add(key);
        const dims = [a.height_cm, a.width_cm, a.depth_cm].filter((v) => typeof v === "number").join(" x ");
        const parts = [a.year, a.medium, a.dimensions_text || (dims ? `${dims} cm` : null), a.edition].filter(Boolean);
        findings.push({
          ...base,
          kind: "artwork",
          label: title,
          value: parts.join(" · ") || null,
          source_url: page.url,
          confidence: "medium",
          payload: { ...a, source_url: page.url },
        });
      }
    }

    // images: only what the page ties to the artist, never every asset on the page
    const imgSeen = new Set<string>();
    const artworkImages = new Set<string>();
    for (const { result } of extractions) {
      for (const a of (result.artworks as Record<string, unknown>[] | undefined) || []) {
        if (typeof a?.image_url === "string" && /^https?:\/\//i.test(a.image_url)) artworkImages.add(a.image_url);
      }
    }
    let imagesSkipped = 0;
    for (const { page, result } of extractions) {
      const listed = (result.images as Record<string, unknown>[] | undefined) || [];
      const candidates = listed
        .map((i) => ({
          url: typeof i.url === "string" ? i.url : "",
          caption: (i.caption as string) || null,
          category: (i.category as string) || "other",
        }))
        .filter((i) => i.url);

      // only fall back to raw page images when the page itself is clearly artist material
      if (!candidates.length && pageIsArtistMaterial(page.url, slugs)) {
        for (const u of page.images.slice(0, 12)) candidates.push({ url: u, caption: null, category: "other" });
      }

      for (const img of candidates) {
        const linkedToWork = artworkImages.has(img.url);
        if (!linkedToWork && !usableImage(img.url)) {
          imagesSkipped++;
          continue;
        }
        if (imgSeen.has(img.url)) continue;
        imgSeen.add(img.url);
        findings.push({
          ...base,
          kind: "image",
          field: img.category,
          label: img.caption || img.url.split("/").pop()?.split("?")[0] || "Image",
          value: img.url,
          source_url: page.url,
          confidence: linkedToWork ? "high" : img.caption ? "medium" : "low",
          payload: { ...img, linked_artwork_image: linkedToWork },
        });
      }
    }


    if (findings.length) {
      // insert in chunks so a large harvest does not hit statement limits
      for (let i = 0; i < findings.length; i += 200) {
        const { error: insErr } = await admin.from("research_findings").insert(findings.slice(i, i + 200));
        if (insErr) console.error("findings insert error", insErr);
      }
    }

    const sources = pages.map((p) => p.url);
    await admin.from("research_runs").update({
      status: "completed",
      sources,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);

    return json({
      run_id: runId,
      count: findings.length,
      pages_read: pages.length,
      pages_failed: failed.length,
      images_kept: imgSeen.size,
      images_skipped: imagesSkipped,
      confidence: findings.length ? "medium" : "low",
      sources,
    });
  } catch (e) {
    console.error("research-artist error", e);
    if (runId) {
      await admin.from("research_runs").update({
        status: "failed",
        error: e instanceof Error ? e.message : "Unknown error",
        completed_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
