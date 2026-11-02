import { PDFDocument } from "pdf-lib";

export type PagePhoto = { id: string; file: File; preview: string; rotation: number };

export function movePage<T>(pages: T[], index: number, direction: number): T[] {
  const target = index + direction;
  if (target < 0 || target >= pages.length) return pages;
  const result = [...pages];
  const [page] = result.splice(index, 1);
  result.splice(target, 0, page);
  return result;
}

export async function photosToPdf(photos: Pick<PagePhoto, "file" | "rotation">[], title: string) {
  if (!photos.length) throw new Error("Add at least one page photo.");
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  for (const photo of photos) {
    const bitmap = await createImageBitmap(photo.file);
    const quarterTurn = photo.rotation % 180 !== 0;
    const canvas = document.createElement("canvas");
    canvas.width = quarterTurn ? bitmap.height : bitmap.width;
    canvas.height = quarterTurn ? bitmap.width : bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) { bitmap.close(); throw new Error("Unable to prepare page photo."); }
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(photo.rotation * Math.PI / 180);
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Unable to prepare page photo.")), "image/jpeg", 0.95));
    const image = await pdf.embedJpg(await blob.arrayBuffer());
    const width = 595;
    const height = width * image.height / image.width;
    pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
  }
  return new File([new Uint8Array(await pdf.save()).buffer], "sketchbook.pdf", { type: "application/pdf" });
}

export async function pdfPageCount(file: File) {
  const pdf = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
  if (!pdf.getPageCount()) throw new Error("The PDF has no pages.");
  return pdf.getPageCount();
}