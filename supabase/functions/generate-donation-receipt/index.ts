// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

// Foundation registration placeholders — fill in once KvK approves the stichting.
const FOUNDATION = {
  legal_name: "Stichting Global Artist Registry Foundation",
  short_name: "Global Artist Registry Foundation",
  address_line_1: Deno.env.get("FOUNDATION_ADDRESS_1") ?? "[Address line 1]",
  address_line_2: Deno.env.get("FOUNDATION_ADDRESS_2") ?? "[Postal code & city]",
  country: Deno.env.get("FOUNDATION_COUNTRY") ?? "The Netherlands",
  kvk: Deno.env.get("FOUNDATION_KVK") ?? "[KvK number — pending]",
  rsin: Deno.env.get("FOUNDATION_RSIN") ?? "[RSIN — pending]",
  iban: Deno.env.get("FOUNDATION_IBAN") ?? "[IBAN — pending]",
  bic: Deno.env.get("FOUNDATION_BIC") ?? "[BIC — pending]",
  signatory_name: Deno.env.get("FOUNDATION_SIGNATORY_NAME") ?? "[Board member name]",
  signatory_role: Deno.env.get("FOUNDATION_SIGNATORY_ROLE") ?? "Board member",
  email: Deno.env.get("FOUNDATION_EMAIL") ?? "support@globalartistregistry.org",
  website: "globalartistregistry.org",
};

interface Receipt {
  receipt_number: string;
  issued_at: string; // ISO
  donor_name: string;
  donor_email?: string | null;
  donor_address?: string | null;
  amount_eur: number;
  payment_method: "stripe_card" | "stripe_ideal" | "bank_transfer" | "other";
  payment_reference?: string | null;
  donation_type?: "one_off" | "monthly" | "annual" | "major_gift" | "collector_access";
  notes?: string | null;
}

function eur(amount: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(amount);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

async function buildPdf(r: Receipt): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);

  const ink = rgb(0.08, 0.08, 0.08);
  const muted = rgb(0.42, 0.42, 0.42);
  const line = rgb(0.85, 0.85, 0.85);

  const marginX = 56;
  let y = height - 64;

  // Header
  page.drawText(FOUNDATION.short_name.toUpperCase(), {
    x: marginX, y, size: 9, font: bold, color: muted,
  });
  y -= 14;
  page.drawText("Donation receipt", { x: marginX, y, size: 22, font: serif, color: ink });

  // Right-aligned meta
  const metaRight = width - marginX;
  const metaLines = [
    ["Receipt no.", r.receipt_number],
    ["Issued", formatDate(r.issued_at)],
  ];
  let metaY = height - 64;
  for (const [k, v] of metaLines) {
    const kw = font.widthOfTextAtSize(k, 9);
    page.drawText(k, { x: metaRight - kw - 110, y: metaY, size: 9, font, color: muted });
    page.drawText(v, { x: metaRight - bold.widthOfTextAtSize(v, 10), y: metaY - 1, size: 10, font: bold, color: ink });
    metaY -= 16;
  }

  y -= 28;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: line });
  y -= 28;

  // Donor block
  page.drawText("ISSUED TO", { x: marginX, y, size: 8, font: bold, color: muted });
  y -= 14;
  page.drawText(r.donor_name, { x: marginX, y, size: 12, font: bold, color: ink });
  y -= 14;
  if (r.donor_email) { page.drawText(r.donor_email, { x: marginX, y, size: 10, font, color: ink }); y -= 12; }
  if (r.donor_address) {
    for (const ln of r.donor_address.split("\n")) {
      page.drawText(ln, { x: marginX, y, size: 10, font, color: ink });
      y -= 12;
    }
  }

  y -= 22;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: line });
  y -= 28;

  // Amount block
  page.drawText("GIFT RECEIVED", { x: marginX, y, size: 8, font: bold, color: muted });
  y -= 22;
  page.drawText(eur(r.amount_eur), { x: marginX, y, size: 32, font: serif, color: ink });
  y -= 24;

  const typeLabel: Record<string, string> = {
    one_off: "One-off donation",
    monthly: "Monthly recurring donation",
    annual: "Annual recurring donation",
    major_gift: "Major gift",
    collector_access: "Collector access gift (€75 / year)",
  };
  const methodLabel: Record<string, string> = {
    stripe_card: "Card payment (Stripe)",
    stripe_ideal: "iDEAL (Stripe)",
    bank_transfer: "Bank transfer",
    other: "Other",
  };

  const rows: [string, string][] = [
    ["Donation type", typeLabel[r.donation_type ?? "one_off"] ?? "Donation"],
    ["Payment method", methodLabel[r.payment_method] ?? r.payment_method],
  ];
  if (r.payment_reference) rows.push(["Payment reference", r.payment_reference]);

  for (const [k, v] of rows) {
    page.drawText(k, { x: marginX, y, size: 9, font, color: muted });
    page.drawText(v, { x: marginX + 140, y, size: 10, font, color: ink });
    y -= 14;
  }

  y -= 18;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: line });
  y -= 22;

  // Statement
  const statement =
    `${FOUNDATION.legal_name} ("the Foundation") hereby confirms receipt of the above ` +
    `gift. The Foundation is a Dutch stichting and the contribution is treated as a gift; ` +
    `it is not consideration for goods or services and is not subject to VAT. This receipt ` +
    `may be retained for the donor's records and, where applicable, submitted to a national ` +
    `tax authority as evidence of a charitable contribution.`;

  drawWrappedText(page, statement, marginX, y, width - marginX * 2, 10, font, ink, 13);
  y -= 13 * Math.ceil(statement.length / 95) + 16;

  if (r.notes) {
    page.drawText("Notes", { x: marginX, y, size: 8, font: bold, color: muted });
    y -= 12;
    drawWrappedText(page, r.notes, marginX, y, width - marginX * 2, 10, font, ink, 13);
    y -= 13 * Math.ceil(r.notes.length / 95) + 12;
  }

  // Signatory
  y = Math.max(y, 180);
  y -= 20;
  page.drawText("Signed on behalf of the Foundation", { x: marginX, y, size: 8, font: bold, color: muted });
  y -= 36;
  page.drawLine({ start: { x: marginX, y }, end: { x: marginX + 220, y }, thickness: 0.5, color: line });
  y -= 12;
  page.drawText(FOUNDATION.signatory_name, { x: marginX, y, size: 10, font: bold, color: ink });
  y -= 12;
  page.drawText(FOUNDATION.signatory_role, { x: marginX, y, size: 9, font, color: muted });

  // Footer
  const footerY = 56;
  page.drawLine({ start: { x: marginX, y: footerY + 38 }, end: { x: width - marginX, y: footerY + 38 }, thickness: 0.5, color: line });
  const footerL = [
    FOUNDATION.legal_name,
    `${FOUNDATION.address_line_1}, ${FOUNDATION.address_line_2}, ${FOUNDATION.country}`,
    `KvK ${FOUNDATION.kvk} · RSIN ${FOUNDATION.rsin}`,
  ];
  let fy = footerY + 22;
  for (const l of footerL) {
    page.drawText(l, { x: marginX, y: fy, size: 8, font, color: muted });
    fy -= 10;
  }
  const footerR = [
    `IBAN ${FOUNDATION.iban} · BIC ${FOUNDATION.bic}`,
    `${FOUNDATION.email} · ${FOUNDATION.website}`,
  ];
  let fry = footerY + 12;
  for (const l of footerR) {
    const w = font.widthOfTextAtSize(l, 8);
    page.drawText(l, { x: width - marginX - w, y: fry, size: 8, font, color: muted });
    fry -= 10;
  }

  return await pdf.save();
}

function drawWrappedText(
  page: any, text: string, x: number, y: number, maxWidth: number,
  size: number, font: any, color: any, lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      page.drawText(line, { x, y: cy, size, font, color });
      cy -= lineHeight;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) page.drawText(line, { x, y: cy, size, font, color });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { donation_id, preview } = body as { donation_id?: string; preview?: Receipt };

    let receipt: Receipt;

    if (preview) {
      receipt = preview;
    } else if (donation_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("id", donation_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return new Response(JSON.stringify({ error: "Donation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      receipt = {
        receipt_number: `GARF-${new Date(data.created_at).getFullYear()}-${String(data.id).slice(0, 8).toUpperCase()}`,
        issued_at: data.created_at,
        donor_name: data.donor_name ?? "Anonymous donor",
        donor_email: data.donor_email,
        donor_address: null,
        amount_eur: Number(data.amount_eur ?? 0),
        payment_method: data.payment_method ?? "stripe_card",
        payment_reference: data.stripe_payment_intent_id ?? data.stripe_session_id ?? null,
        donation_type: data.donation_type ?? "one_off",
        notes: null,
      };
    } else {
      // Sample preview so the route is usable while bank details are pending
      receipt = {
        receipt_number: "GARF-2026-PREVIEW",
        issued_at: new Date().toISOString(),
        donor_name: "Sample Donor",
        donor_email: "donor@example.com",
        donor_address: null,
        amount_eur: 10000,
        payment_method: "bank_transfer",
        payment_reference: "TEST-REF-001",
        donation_type: "major_gift",
        notes: "This is a sample preview of the Foundation donation receipt template.",
      };
    }

    const pdfBytes = await buildPdf(receipt);
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${receipt.receipt_number}.pdf"`,
      },
    });
  } catch (err) {
    console.error("generate-donation-receipt error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
