export const PUBLIC_ORIGIN = "https://globalartistregistry.org";
export const DEFAULT_TITLE = "Global Artist Registry Foundation — Artist Archives & Catalogue Raisonné";
export const DEFAULT_DESCRIPTION = "Free artist-controlled archives, artwork documentation, artist websites and catalogues raisonnés, with a 100-year preservation and succession plan.";

export const publicPages: Record<string, { title: string; description: string }> = {
  "/": { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  "/about": { title: "About the Global Artist Registry Foundation", description: "An independent non-profit foundation preserving the documentation of contemporary art, artist-authenticated records built for 100 years." },
  "/why-garf-matters": { title: "Why GARF Matters — Global Artist Registry Foundation", description: "Art documentation is disappearing. The Global Artist Registry Foundation is an independent Dutch stichting building a permanent, artist-authenticated archive for 100 years." },
  "/founding-artists": { title: "Artists & Artist Legacy Protection — GARF", description: "Explore artist websites and the Artist Legacy Protection program. Artists worldwide can register freely and retain control of their archives." },
  "/registrars": { title: "Verified Art Registrars — GARF", description: "Find verified registrars who help artists organise artwork documentation and preserve their archives." },
  "/donors": { title: "Supporters & Ambassadors — GARF", description: "Meet the supporters and personal ambassadors of the Global Artist Registry Foundation." },
  "/contact": { title: "Contact the Global Artist Registry Foundation", description: "Contact GARF or book a 30 minute video meeting with the foundation. Meetings available 08:00 to 18:00 CET." },
  "/faq": { title: "Frequently Asked Questions | Global Artist Registry Foundation", description: "Answers for artists, collectors, registrars and organisations about the Global Artist Registry Foundation, verification, preservation and data ownership." },
  "/tutorials": { title: "Video Tutorials | Global Artist Registry Foundation", description: "Short video tutorials showing how to register, build a profile, import a catalogue, document exhibitions, and add the Registry to your home screen." },
  "/news": { title: "News | Global Artist Registry Foundation", description: "Announcements and updates from the Global Artist Registry Foundation, including partnerships with artist organisations and institutions." },
  "/foundation": { title: "The Foundation — Global Artist Registry", description: "The Global Artist Registry Foundation: a Dutch stichting preserving the documentary record of contemporary art for at least one hundred years." },
  "/terms": { title: "User Agreement — Global Artist Registry Foundation", description: "The GARF user agreement: you own your records, artists use the registry free, no commercial use of your data, and a 100-year preservation and succession commitment." },
  "/statement-of-support": { title: "Statement of Support — Global Artist Registry Foundation", description: "Collectors, artists and institutions supporting verified, independent documentation of contemporary art. Add your name to the Statement of Support." },
  "/invitation": { title: "Invitation to artists: download in your language | GARF", description: "Download the Global Artist Registry Foundation invitation to artists as a PDF in English, German, French, Spanish, Italian or Polish." },
  "/cr": { title: "Catalogue Raisonné Directory — GARF", description: "Explore published and in-preparation catalogues raisonnés and the artists whose work they document." },
  "/support": { title: "Support Artist Legacies — GARF", description: "Support the Global Artist Registry Foundation and long-term preservation of artist-controlled documentation." },
  "/donate": { title: "Donate — Global Artist Registry Foundation", description: "Help the Global Artist Registry Foundation preserve artists’ documentation and legacies for future generations." },
  "/apply-for-invitation": { title: "Artist Legacy Protection Application — GARF", description: "Apply to the Artist Legacy Protection program. GARF accounts are free for artists and registration is open." },
  "/founding-supporter": { title: "Founding Supporters — GARF", description: "Support the foundation’s long-term work protecting artists’ legacies." },
};

export function pageUrl(path: string) {
  return `${PUBLIC_ORIGIN}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
}

export function artistMetadata(name: string, section: string = "", tagline?: string | null) {
  return {
    title: `${name}${section ? ` — ${section}` : ""} | GARF`,
    description: tagline?.trim() || `Explore ${name}’s ${section ? section.toLowerCase() : "artworks, exhibitions and artist archive"} on the Global Artist Registry Foundation.`,
  };
}

export function sitemapXml(paths: string[]) {
  const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(paths)].map(path => `  <url><loc>${escape(pageUrl(path))}</loc></url>`).join("\n")}\n</urlset>\n`;
}