import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddArtworkDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState("");
  const [year, setYear] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("artworks").insert({
      title: title.trim(),
      medium: medium.trim() || null,
      year: year ? parseInt(year) : null,
      dimensions: dimensions.trim() || null,
      description: description.trim() || null,
    });

    setLoading(false);
    if (error) {
      toast.error("Failed to add artwork");
    } else {
      toast.success("Artwork added");
      setTitle("");
      setMedium("");
      setYear("");
      setDimensions("");
      setDescription("");
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Artwork</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="medium">Medium</Label>
              <Input id="medium" value={medium} onChange={(e) => setMedium(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input id="dimensions" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 60 × 80 cm" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Artwork"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
