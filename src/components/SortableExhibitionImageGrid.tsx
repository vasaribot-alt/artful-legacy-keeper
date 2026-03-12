import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, ImagePlus, Star } from "lucide-react";

interface ExhibitionImage {
  id: string;
  storage_path: string;
  display_order: number;
  caption: string | null;
  publicUrl: string;
}

interface SortableImageProps {
  img: ExhibitionImage;
  index: number;
  isMain: boolean;
  onDelete: (img: ExhibitionImage) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onClickImage: (index: number) => void;
}

const SortableImage = ({ img, index, isMain, onDelete, onCaptionChange, onClickImage }: SortableImageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/card space-y-1">
      <div className="relative group aspect-[4/3] bg-secondary rounded-sm overflow-hidden">
        <img
          src={img.publicUrl}
          alt={img.caption || ""}
          className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        />
        {/* Click overlay for lightbox - separate from drag handle */}
        <button
          className="absolute inset-0 z-[1]"
          style={{ pointerEvents: "none" }}
          onClick={() => onClickImage(index)}
          tabIndex={-1}
        />
        {isMain && (
          <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground rounded-full p-1" title="Main image">
            <Star className="w-3 h-3 fill-current" />
          </div>
        )}
        <button
          onClick={() => onDelete(img)}
          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-[2]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className={img.caption ? "" : "opacity-0 group-hover/card:opacity-100 transition-opacity"}>
        <input
          type="text"
          placeholder="Photo credit / caption"
          defaultValue={img.caption || ""}
          onBlur={(e) => onCaptionChange(img.id, e.target.value)}
          className="w-full text-[11px] text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 px-0.5"
        />
      </div>
    </div>
  );
};

interface SortableExhibitionImageGridProps {
  exhibitionId: string;
  images: ExhibitionImage[];
  onReorder: (exhibitionId: string, reorderedImages: ExhibitionImage[]) => void;
  onDeleteImage: (img: ExhibitionImage) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onClickImage: (index: number) => void;
  onUpload: (exhibitionId: string, files: FileList) => void;
}

export const SortableExhibitionImageGrid = ({
  exhibitionId,
  images,
  onReorder,
  onDeleteImage,
  onCaptionChange,
  onClickImage,
  onUpload,
}: SortableExhibitionImageGridProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...images];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorder(exhibitionId, reordered);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img, imgIdx) => (
            <SortableImage
              key={img.id}
              img={img}
              index={imgIdx}
              isMain={imgIdx === 0}
              onDelete={onDeleteImage}
              onCaptionChange={onCaptionChange}
              onClickImage={onClickImage}
            />
          ))}
          {/* Add image button */}
          <label className="aspect-[4/3] border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-foreground/40 transition-colors">
            <ImagePlus className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Add View</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && onUpload(exhibitionId, e.target.files)}
            />
          </label>
        </div>
      </SortableContext>
    </DndContext>
  );
};
