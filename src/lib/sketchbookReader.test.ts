import { describe, expect, it } from "vitest";
import { canDownloadSketchbook, fitSketchbookPage } from "./sketchbookReader";

describe("sketchbook reading", () => {
  it("fits portrait pages without scrolling", () => {
    const scale = fitSketchbookPage(600, 900, 700, 400);
    expect(900 * scale).toBe(400);
    expect(600 * scale).toBeLessThanOrEqual(700);
  });
  it("fits landscape pages without scrolling", () => {
    const scale = fitSketchbookPage(900, 600, 500, 700);
    expect(900 * scale).toBe(500);
    expect(600 * scale).toBeLessThanOrEqual(700);
  });
  it("disables public downloads by default", () => {
    expect(canDownloadSketchbook(true)).toBe(false);
  });
  it("allows public downloads only after artist opt-in", () => {
    expect(canDownloadSketchbook(true, true)).toBe(true);
    expect(canDownloadSketchbook(true, false)).toBe(false);
  });
  it("keeps personal archive downloads available", () => {
    expect(canDownloadSketchbook(false, false)).toBe(true);
  });
});