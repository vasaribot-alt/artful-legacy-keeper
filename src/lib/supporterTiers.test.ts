import { describe, expect, it } from "vitest";
import {
  MONETARY_TIER_ORDER,
  SUPPORTER_TIER_ORDER,
  SUPPORTER_TIERS,
  isAmbassadorTier,
  supporterTierLabel,
} from "./supporterTiers";

describe("supporter tiers", () => {
  it("never shows a donation amount for ambassadors", () => {
    expect(SUPPORTER_TIERS.ambassador.amount).toBeNull();
    expect(isAmbassadorTier("ambassador")).toBe(true);
    expect(isAmbassadorTier("bronze")).toBe(false);
    expect(isAmbassadorTier(null)).toBe(false);
  });

  it("keeps an amount for every gift tier", () => {
    for (const tier of MONETARY_TIER_ORDER) {
      expect(SUPPORTER_TIERS[tier].amount).toMatch(/€\d/);
    }
    expect(MONETARY_TIER_ORDER).toEqual(["platinum", "gold", "silver", "bronze"]);
  });

  it("lists ambassadors last on the public supporters page", () => {
    expect(SUPPORTER_TIER_ORDER).toEqual([
      "platinum",
      "gold",
      "silver",
      "bronze",
      "ambassador",
    ]);
  });

  it("gives every level a label and description", () => {
    for (const tier of SUPPORTER_TIER_ORDER) {
      expect(SUPPORTER_TIERS[tier].label.trim().length).toBeGreaterThan(0);
      expect(SUPPORTER_TIERS[tier].description.trim().length).toBeGreaterThan(0);
    }
  });

  it("falls back to a plain label for unknown levels", () => {
    expect(supporterTierLabel("unknown")).toBe("Supporter");
    expect(supporterTierLabel("ambassador")).toBe("Ambassadors");
  });
});
