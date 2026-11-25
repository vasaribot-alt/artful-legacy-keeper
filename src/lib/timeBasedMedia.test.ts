import { describe, it, expect } from "vitest";
import { cleanTimeBasedDetails, isTimeBasedType } from "./timeBasedMedia";

describe("time-based media", () => {
  it("recognises video art and performance only", () => {
    expect(isTimeBasedType("Video art")).toBe(true);
    expect(isTimeBasedType("Performance")).toBe(true);
    expect(isTimeBasedType("Painting")).toBe(false);
  });
  it("stores nothing for non time-based types", () => {
    expect(cleanTimeBasedDetails("Painting", { duration: "10 min" })).toBeNull();
  });
  it("keeps performance events only for performances", () => {
    const ev = [{ date: "2024", place: "Oslo", performers: "Tori" }];
    expect(cleanTimeBasedDetails("Performance", { events: ev })?.events).toEqual(ev);
    expect(cleanTimeBasedDetails("Video art", { events: ev })).toBeNull();
  });
});
