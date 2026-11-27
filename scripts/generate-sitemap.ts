import { writeFileSync } from "node:fs";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { publicPages, sitemapXml } from "../src/lib/publicSeo";

// Only anonymous, publicly readable data is used; no owner or service session.
const env = { ...loadEnv("production", process.cwd(), "VITE_"), ...process.env };
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Public backend configuration is required to generate the sitemap.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const paths = Object.keys(publicPages);

async function allRows(table: string, columns: string, filter?: [string, boolean]) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = client.from(table).select(columns).range(offset, offset + 499);
    if (filter) query = query.eq(filter[0], filter[1]);
    const { data, error } = await query;
    if (error) throw new Error(`Cannot load public sitemap entries from ${table}.`);
    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < 500) break;
  }
  return rows;
}

const [sites, founding, cr, registrars] = await Promise.all([
  client.rpc("list_public_artist_websites"),
  allRows("founding_artists", "user_id"),
  allRows("profiles", "global_artist_id", ["cr_listed", true]),
  client.rpc("get_verified_registrars"),
]);
if (sites.error || registrars.error) throw new Error("Cannot load public directories for the sitemap.");
for (const entry of sites.data ?? []) {
  const base = `/site/${encodeURIComponent(entry.slug)}`;
  // Mirror the website loader to include only sections it actually publishes.
  const { data, error } = await client.rpc("get_artist_site", { _key: entry.slug });
  if (error) throw new Error("Cannot load a published artist website for the sitemap.");
  const site = Array.isArray(data) ? data[0] : data;
  if (!site) continue;
  paths.push(base, `${base}/works`, `${base}/about`, `${base}/contact`);
  const sections = site.sections ?? {};
  if (sections.exh_solo || sections.exh_group || sections.exh_upcoming) paths.push(`${base}/exhibitions`);
  if (sections.cv_web || sections.cv_pdf) paths.push(`${base}/cv`);
  if (sections.publications) paths.push(`${base}/publications`);
  if (sections.news) paths.push(`${base}/news`);
  for (const [table, section] of [["sketchbooks", "sketchbooks"], ["archival_documents", "documents"]]) {
    const { count, error: archiveError } = await client.from(table).select("id", { count: "exact", head: true }).eq("owner_id", site.user_id).eq("role_context", "artist").eq("is_public", true);
    if (archiveError) throw new Error("Cannot check public archive sections for the sitemap.");
    if (count) paths.push(`${base}/${section}`);
  }
}
for (const entry of founding) {
  // Some memberships have no anonymously readable profile; do not list those.
  const { data, error } = await client.from("profiles").select("user_id").eq("user_id", entry.user_id).maybeSingle();
  if (error) throw new Error("Cannot check a public artist profile for the sitemap.");
  if (data) paths.push(`/artist/${encodeURIComponent(data.user_id)}`);
}
for (const entry of cr) paths.push(`/cr/artist/${entry.global_artist_id}`);
for (const entry of registrars.data ?? []) paths.push(`/registrars/${encodeURIComponent(entry.user_id)}`);
writeFileSync("public/sitemap.xml", sitemapXml(paths));
console.log(`Sitemap updated: ${new Set(paths).size} public URLs.`);