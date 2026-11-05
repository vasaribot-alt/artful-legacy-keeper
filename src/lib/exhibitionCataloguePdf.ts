import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";

export type CatalogueLayout = "single" | "paired";
export interface CatalogueWork {
  id: string;
  title: string;
  caption: string;
  imageUrl: string | null;
}
export interface CatalogueInput {
  title: string;
  artist: string;
  details: string;
  introduction: string;
  credits: string;
  layout: CatalogueLayout;
  works: CatalogueWork[];
}

export function fitCatalogueImage(width: number, height: number, boxWidth: number, boxHeight: number) {
  const scale = Math.min(boxWidth / width, boxHeight / height);
  return { width: width * scale, height: height * scale };
}

export function catalogueWorkPages<T>(works: T[], layout: CatalogueLayout): T[][] {
  const size = layout === "paired" ? 2 : 1;
  return Array.from({ length: Math.ceil(works.length / size) }, (_, i) => works.slice(i * size, (i + 1) * size));
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ""; }
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

async function imageBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Image unavailable");
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Image conversion unavailable"); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const converted = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image conversion failed")), "image/png"));
  return converted.arrayBuffer();
}

export async function createExhibitionCatalogue(input: CatalogueInput) {
  if (!input.title.trim()) throw new Error("Add a catalogue title.");
  if (!input.works.length) throw new Error("Select at least one linked artwork.");
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts = await Promise.all(["sans", "serif"].map(async name => {
    const response = await fetch(`/fonts/catalogue-${name}.ttf`);
    if (!response.ok) throw new Error("Unable to load catalogue fonts.");
    return pdf.embedFont(await response.arrayBuffer(), { subset: true });
  }));
  const [body, heading] = fonts;
  const ink = rgb(0.08, 0.08, 0.08);
  const grey = rgb(0.4, 0.4, 0.4);
  const warnings: string[] = [];
  const images = new Map<string, Awaited<ReturnType<PDFDocument["embedPng"]>>>();
  for (const work of input.works) {
    if (!work.imageUrl) { warnings.push(`${work.title}: no image`); continue; }
    try { images.set(work.id, await pdf.embedPng(await imageBytes(work.imageUrl))); }
    catch { warnings.push(`${work.title}: image could not be loaded`); }
  }
  const addPage = () => pdf.addPage([595.28, 841.89]);
  const drawLines = (page: PDFPage, lines: string[], x: number, y: number, font: PDFFont, size: number, leading: number) => {
    lines.forEach((line, i) => page.drawText(line, { x, y: y - i * leading, font, size, color: ink }));
  };
  const cover = addPage();
  cover.drawText("EXHIBITION CATALOGUE", { x: 48, y: 782, font: body, size: 10, color: grey });
  const titleLines = wrap(input.title, heading, 28, 499);
  if (titleLines.length > 5) throw new Error("Shorten the catalogue title to fit the cover.");
  drawLines(cover, titleLines, 48, 735, heading, 28, 35);
  const artistLines = wrap(input.artist, body, 12, 499);
  if (artistLines.length > 3) throw new Error("Shorten the artist line to fit the cover.");
  drawLines(cover, artistLines, 48, 720 - titleLines.length * 35, body, 12, 17);
  const first = images.get(input.works[0].id);
  if (first) {
    const fitted = fitCatalogueImage(first.width, first.height, 499, 390);
    cover.drawImage(first, { x: (595.28 - fitted.width) / 2, y: 170 + (390 - fitted.height) / 2, ...fitted });
  }
  const detailsLines = wrap(input.details, body, 10, 499);
  if (detailsLines.length > 6) throw new Error("Exhibition details are too long for the cover.");
  drawLines(cover, detailsLines, 48, 135, body, 10, 14);

  const textPages = (title: string, text: string) => {
    if (!text.trim()) return;
    const lines = wrap(text, body, 11, 499);
    for (let i = 0; i < lines.length; i += 38) {
      const page = addPage();
      page.drawText(i ? `${title} (continued)` : title, { x: 48, y: 772, font: heading, size: 22, color: ink });
      drawLines(page, lines.slice(i, i + 38), 48, 724, body, 11, 17);
    }
  };
  textPages("Exhibition text", input.introduction);
  for (const group of catalogueWorkPages(input.works, input.layout)) {
    const page = addPage();
    for (let i = 0; i < group.length; i++) {
      const work = group[i];
      const top = 782 - (input.layout === "paired" ? i * 356 : 0);
      const captionLines = wrap(`${work.title}\n${work.caption}`, body, 10, 499);
      const regionHeight = input.layout === "paired" ? 340 : 704;
      const imageHeight = regionHeight - captionLines.length * 14 - 22;
      if (imageHeight < 100) throw new Error(`The caption for “${work.title}” is too long. Shorten its caption before preparing the PDF.`);
      const image = images.get(work.id);
      if (image) {
        const fitted = fitCatalogueImage(image.width, image.height, 499, imageHeight);
        page.drawImage(image, { x: (595.28 - fitted.width) / 2, y: top - imageHeight + (imageHeight - fitted.height) / 2, ...fitted });
      } else {
        page.drawText("Image unavailable", { x: 48, y: top - imageHeight / 2, font: body, size: 11, color: grey });
      }
      drawLines(page, captionLines, 48, top - imageHeight - 20, body, 10, 14);
    }
  }
  textPages("Credits and image rights", input.credits);
  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    page.drawText("Global Artist Registry Foundation", { x: 48, y: 30, font: body, size: 8, color: grey });
    page.drawText(`${index + 1} / ${pages.length}`, { x: 510, y: 30, font: body, size: 8, color: grey });
  });
  pdf.setTitle(input.title); pdf.setAuthor(input.artist); pdf.setCreator("Global Artist Registry Foundation");
  return { blob: new Blob([new Uint8Array(await pdf.save()).buffer], { type: "application/pdf" }), warnings };
}