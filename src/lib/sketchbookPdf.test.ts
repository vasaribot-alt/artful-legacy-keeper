// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { movePage, pdfPageCount, photosToPdf } from "./sketchbookPdf";

describe("sketchbooks", () => {
  it("preserves the artist's chosen page order", () => {
    expect(movePage(["cover", "page 2", "page 3"], 2, -1)).toEqual(["cover", "page 3", "page 2"]);
  });
  it("accepts an existing PDF and reads its page count", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage(); pdf.addPage();
    expect(await pdfPageCount(new File([new Uint8Array(await pdf.save()).buffer], "book.pdf", { type: "application/pdf" }))).toBe(2);
  });
  it("does not create a sketchbook without page photos", async () => {
    await expect(photosToPdf([], "Empty")).rejects.toThrow("Add at least one page photo.");
  });
});