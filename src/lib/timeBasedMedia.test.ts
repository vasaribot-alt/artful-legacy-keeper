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

import { cleanTimeBasedDetails as clean2 } from "./timeBasedMedia";
import { it as it2, expect as expect2 } from "vitest";
it2("keeps commissioner, link and premiere on performance events", () => {
  const r = clean2("Performance", { events: [{ date: "23.05.24", place: "Studio Bergen", performers: "", commissioner: " Carte Blanche ", link: "https://x.no", premiere: true }] });
  expect2(r?.events?.[0]).toEqual({ date: "23.05.24", place: "Studio Bergen", performers: "", commissioner: "Carte Blanche", link: "https://x.no", premiere: true });
});
