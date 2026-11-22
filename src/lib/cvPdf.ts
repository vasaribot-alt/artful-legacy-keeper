import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, rgb } from "pdf-lib";

export interface CvPdfSection { section: string; entries: { year?: string | null; entry_text?: string | null }[] }

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = word;
      while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function buildCvPdf(artistName: string, sections: CvPdfSection[]): Promise<Blob> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [body, heading] = await Promise.all(["sans", "serif"].map(async (name) => {
    const res = await fetch(`/fonts/catalogue-${name}.ttf`);
    if (!res.ok) throw new Error("Unable to load PDF fonts.");
    return pdf.embedFont(await res.arrayBuffer(), { subset: true });
  }));
  const supported = new Set(body.getCharacterSet());
  const clean = (t: string) => Array.from(t).map((c) => (c === "\n" || supported.has(c.codePointAt(0)!) ? c : "?")).join("");
  const ink = rgb(0.07, 0.07, 0.07), grey = rgb(0.45, 0.45, 0.45), line = rgb(0.88, 0.88, 0.88);
  const W = 595, H = 842, M = 56, yearW = 70, textW = W - 2 * M - yearW;
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const ensure = (h: number) => { if (y - h < M) { page = pdf.addPage([W, H]); y = H - M; } };

  page.drawText(clean(artistName), { x: M, y: y - 24, font: heading, size: 24, color: ink });
  y -= 44;
  page.drawText("CURRICULUM VITAE", { x: M, y, font: body, size: 9, color: grey });
  y -= 30;

  for (const s of sections) {
    ensure(60);
    y -= 14;
    page.drawText(clean(s.section), { x: M, y, font: heading, size: 14, color: ink });
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: line });
    y -= 16;
    for (const e of s.entries) {
      const lines = wrap(clean(e.entry_text || ""), body, 10, textW);
      const h = lines.length * 14 + 4;
      ensure(h);
      if (e.year) page.drawText(clean(e.year), { x: M, y, font: body, size: 9.5, color: grey });
      lines.forEach((l, i) => page.drawText(l, { x: M + yearW, y: y - i * 14, font: body, size: 10, color: ink }));
      y -= h;
    }
  }
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function cvPdfFilename(name: string) {
  return `CV_${(name || "Artist").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "")}.pdf`;
}
