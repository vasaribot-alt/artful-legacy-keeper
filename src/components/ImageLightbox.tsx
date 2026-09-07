import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, LayoutGrid, Image as ImageIcon } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  index: number;
  caption?: string;
  onIndexChange?: (index: number) => void;
  onClose: () => void;
}

/**
 * Fullscreen viewer that always shows the whole image (never cropped),
 * regardless of the portrait/landscape orientation of the source file.
 * With several images it also offers a thumbnail strip and a grid overview
 * so a series of photos can be seen together.
 */
export const ImageLightbox = ({ images, index, caption, onIndexChange, onClose }: ImageLightboxProps) => {
  const multiple = images.length > 1;
  const [grid, setGrid] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (grid) setGrid(false);
        else onClose();
        return;
      }
      if (!multiple || !onIndexChange) return;
      if (e.key === "g" || e.key === "G") setGrid((g) => !g);
      if (grid) return;
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, images.length, multiple, onIndexChange, onClose, grid]);

  const src = images[index];
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/97 backdrop-blur-sm flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between gap-3 p-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-muted-foreground pl-1">
          {multiple ? `${index + 1} / ${images.length}` : ""}
        </span>
        <div className="flex items-center gap-1">
          {multiple && (
            <button
              type="button"
              onClick={() => setGrid((g) => !g)}
              aria-label={grid ? "Show single image" : "Show all images"}
              title={grid ? "Show single image" : "Show all images"}
              className="p-2 rounded-sm text-foreground hover:bg-secondary transition-colors"
            >
              {grid ? <ImageIcon className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-sm text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {grid && multiple ? (
        <div
          className="flex-1 min-h-0 overflow-y-auto px-4 pb-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
            {images.map((img, i) => (
              <button
                key={img + i}
                type="button"
                onClick={() => {
                  onIndexChange?.(i);
                  setGrid(false);
                }}
                className={`aspect-square bg-secondary rounded-sm overflow-hidden border transition-colors ${
                  i === index ? "border-foreground" : "border-transparent hover:border-border"
                }`}
              >
                <img src={img} alt={`${caption || "Image"} ${i + 1}`} className="w-full h-full object-contain" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 pb-4 relative">
          {multiple && onIndexChange && (
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange((index - 1 + images.length) % images.length);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <img
            src={src}
            alt={caption || "Artwork"}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
          {multiple && onIndexChange && (
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange((index + 1) % images.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {caption && (
        <p className="shrink-0 text-center text-xs text-muted-foreground pb-3 px-6">{caption}</p>
      )}

      {multiple && !grid && onIndexChange && (
        <div
          className="shrink-0 flex gap-2 overflow-x-auto px-4 pb-5 justify-start sm:justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Image ${i + 1}`}
              className={`w-14 h-14 shrink-0 bg-secondary rounded-sm overflow-hidden border transition-colors ${
                i === index ? "border-foreground" : "border-transparent hover:border-border opacity-70 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-contain" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;
