interface Artwork {
  id: string;
  title: string;
  medium: string | null;
  year: number | null;
  dimensions: string | null;
  description: string | null;
  image_url: string | null;
}

export const ArtworkCard = ({ artwork }: { artwork: Artwork }) => {
  return (
    <div className="group cursor-pointer">
      <div className="aspect-[3/4] bg-secondary rounded-sm overflow-hidden mb-3">
        {artwork.image_url ? (
          <img
            src={artwork.image_url}
            alt={artwork.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium leading-tight">{artwork.title}</h3>
      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
        {artwork.year && <span>{artwork.year}</span>}
        {artwork.year && artwork.medium && <span>·</span>}
        {artwork.medium && <span>{artwork.medium}</span>}
      </div>
      {artwork.dimensions && (
        <p className="text-xs text-muted-foreground mt-0.5">{artwork.dimensions}</p>
      )}
    </div>
  );
};
