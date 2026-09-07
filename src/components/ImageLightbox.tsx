import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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
 */
export const ImageLightbox = ({ images, index, caption, onIndexChange, onClose }: ImageLightboxProps) => {
  const multiple = images.length > 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (!multiple || !onIndexChange) return;
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
  }, [index, images.length, multiple, onIndexChange, onClose]);

  const src = images[index];
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/97 backdrop-blur-sm flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-end p-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-sm text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

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

      {caption && (
        <p className="shrink-0 text-center text-xs text-muted-foreground pb-5 px-6">{caption}</p>
      )}
    </div>
  );
};

export default ImageLightbox;
