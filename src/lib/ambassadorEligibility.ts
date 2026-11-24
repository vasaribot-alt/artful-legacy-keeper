export interface ArtistAmbassadorProgress {
  idVerified: boolean;
  biography: string | null;
  artworks: number;
  worksWithPhotos: number;
  exhibitions: number;
  cvEntries: number;
  websiteEnabled: boolean;
}

export function artistAmbassadorMilestones(progress: ArtistAmbassadorProgress) {
  return [
    { label: "Verified identity", complete: progress.idVerified },
    { label: "Biography", complete: (progress.biography?.trim().length ?? 0) > 20 },
    { label: "Artworks", complete: progress.artworks > 0 },
    { label: "Artwork photos", complete: progress.worksWithPhotos > 0 },
    { label: "Exhibitions", complete: progress.exhibitions > 0 },
    { label: "CV", complete: progress.cvEntries > 0 },
    { label: "GARF website", complete: progress.websiteEnabled },
  ];
}

export function isArtistAmbassadorEligible(progress: ArtistAmbassadorProgress) {
  return artistAmbassadorMilestones(progress).filter((step) => step.complete).length >= 4;
}

export function isCollectorAmbassadorEligible(artworks: number) {
  return artworks > 10;
}