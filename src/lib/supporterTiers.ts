export type SupporterTier = "platinum" | "gold" | "silver" | "bronze" | "ambassador";

export interface SupporterTierInfo {
  label: string;
  /** Donation amount shown to the public, or null when the level is not a gift. */
  amount: string | null;
  description: string;
}

export const SUPPORTER_TIERS: Record<SupporterTier, SupporterTierInfo> = {
  platinum: {
    label: "Platinum",
    amount: "€10,000 and above",
    description: "Visionary supporters who make the foundation's core mission possible.",
  },
  gold: {
    label: "Gold",
    amount: "€5,000",
    description: "Major contributors driving key initiatives and programs.",
  },
  silver: {
    label: "Silver",
    amount: "€2,500",
    description: "Valued supporters advancing art preservation and documentation.",
  },
  bronze: {
    label: "Bronze",
    amount: "€1,000",
    description: "Friends of the foundation who believe in the mission.",
  },
  ambassador: {
    label: "Ambassadors",
    amount: null,
    description: "Artists and collectors who support the foundation by lending their name.",
  },
};

export const SUPPORTER_TIER_ORDER: SupporterTier[] = [
  "platinum",
  "gold",
  "silver",
  "bronze",
  "ambassador",
];

/** Levels that represent a gift; used by the public tier table. */
export const MONETARY_TIER_ORDER: SupporterTier[] = SUPPORTER_TIER_ORDER.filter(
  (tier) => SUPPORTER_TIERS[tier].amount !== null,
);

/** Ambassador support is lending a name, never an implied donation. */
export function isAmbassadorTier(tier: string | null | undefined): boolean {
  return tier === "ambassador";
}

export function supporterTierLabel(tier: string | null | undefined): string {
  if (tier && tier in SUPPORTER_TIERS) return SUPPORTER_TIERS[tier as SupporterTier].label;
  return "Supporter";
}
