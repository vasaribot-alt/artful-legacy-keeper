import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPES, DEFAULT_DOCUMENT_VISIBILITY, canPublishDocument, validArchivalDate } from "./archivalDocuments";
describe("archival documents", () => {
  it("keeps documents private until chosen by the artist", () => { expect(DEFAULT_DOCUMENT_VISIBILITY).toBe(false); });
  it("allows only the artist to choose publication", () => { expect(canPublishDocument("artist", "registrar")).toBe(false); expect(canPublishDocument("artist", "artist")).toBe(true); });
  it("accepts historical document dates from the early 1990s", () => { expect(validArchivalDate("1992")).toBe(true); expect(validArchivalDate("1992-06-15")).toBe(true); expect(validArchivalDate("1992-99")).toBe(false); });
  it("includes Alfred's manuscript and audience feedback records", () => { expect(DOCUMENT_TYPES).toContain("Manuscript"); expect(DOCUMENT_TYPES).toContain("Audience feedback"); });
});