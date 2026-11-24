import { describe, expect, it } from "vitest";
import { artistAmbassadorMilestones, isArtistAmbassadorEligible, isCollectorAmbassadorEligible, type ArtistAmbassadorProgress } from "./ambassadorEligibility";

const empty: ArtistAmbassadorProgress = {
  idVerified: false, biography: null, artworks: 0, worksWithPhotos: 0,
  exhibitions: 0, cvEntries: 0, websiteEnabled: false,
};

describe("ambassador invitations", () => {
  it("invites artists at four of seven milestones, but not three", () => {
    const three = { ...empty, artworks: 1, worksWithPhotos: 1, exhibitions: 1 };
    expect(artistAmbassadorMilestones(three)).toHaveLength(7);
    expect(isArtistAmbassadorEligible(three)).toBe(false);
    expect(isArtistAmbassadorEligible({ ...three, cvEntries: 1 })).toBe(true);
    expect(isArtistAmbassadorEligible({ ...three, cvEntries: 1, websiteEnabled: true })).toBe(true);
  });
  it("invites collectors with more than ten works, not exactly ten", () => {
    expect(isCollectorAmbassadorEligible(0)).toBe(false);
    expect(isCollectorAmbassadorEligible(10)).toBe(false);
    expect(isCollectorAmbassadorEligible(11)).toBe(true);
  });
});