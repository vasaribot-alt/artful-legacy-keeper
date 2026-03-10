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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const currencies = ["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF"];
const artworkTypes = ["Painting", "Drawing", "Collage", "Print", "Photography", "Sculpture"];
const sculptureSubCategories = ["Modelled", "Casted", "Carved", "Assembled", "3D printed"];

export const AddArtworkDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const [title, setTitle] = useState("");
  const [artworkType, setArtworkType] = useState("");
  const [medium, setMedium] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [isUnique, setIsUnique] = useState(true);
  const [series, setSeries] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [support, setSupport] = useState("");
  const [signed, setSigned] = useState("");
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [artworkLocation, setArtworkLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setTitle(""); setMedium(""); setYear(""); setDescription("");
    setIsUnique(true); setSeries(""); setSubCategory(""); setSupport("");
    setSigned(""); setHeight(""); setWidth(""); setDepth("");
    setWeight(""); setPrice(""); setCurrency("EUR"); setArtworkLocation("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("artworks").insert({
      owner_id: user.id,
      title: title.trim(),
      medium: medium.trim() || null,
      year: year ? parseInt(year) : null,
      description: description.trim() || null,
      is_unique: isUnique,
      series: series.trim() || null,
      sub_category: subCategory.trim() || null,
      support: support.trim() || null,
      signed: signed.trim() || null,
      height: height ? parseFloat(height) : null,
      width: width ? parseFloat(width) : null,
      depth: depth ? parseFloat(depth) : null,
      weight: weight ? parseFloat(weight) : null,
      price: price ? parseFloat(price) : null,
      currency: currency,
      artwork_location: artworkLocation.trim() || null,
    });

    setLoading(false);
    if (error) {
      toast.error("Failed to add artwork");
    } else {
      toast.success("Artwork added");
      resetForm();
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Artwork</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Core info */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year">Date of creation</Label>
              <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2024" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="series">Series / Group</Label>
              <Input id="series" value={series} onChange={(e) => setSeries(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Unique work</Label>
              <p className="text-xs text-muted-foreground">Toggle off for editions</p>
            </div>
            <Switch checked={isUnique} onCheckedChange={setIsUnique} />
          </div>

          <Separator />

          {/* Materials */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="medium">Medium</Label>
              <Input id="medium" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="e.g. Oil on canvas" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="support">Support</Label>
              <Input id="support" value={support} onChange={(e) => setSupport(e.target.value)} placeholder="e.g. Linen" className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="subCategory">Sub-category</Label>
              <Input id="subCategory" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="e.g. Casted, Carved" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="signed">Signed</Label>
              <Input id="signed" value={signed} onChange={(e) => setSigned(e.target.value)} placeholder="e.g. Signed verso" className="mt-1.5" />
            </div>
          </div>

          <Separator />

          {/* Dimensions */}
          <div>
            <Label className="mb-1.5 block">Dimensions (cm)</Label>
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Height" />
              <Input type="number" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="Width" />
              <Input type="number" step="0.1" value={depth} onChange={(e) => setDepth(e.target.value)} placeholder="Depth" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={artworkLocation} onChange={(e) => setArtworkLocation(e.target.value)} placeholder="e.g. Studio, Storage" className="mt-1.5" />
            </div>
          </div>

          <Separator />

          {/* Price */}
          <div>
            <Label className="mb-1.5 block">Price</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Amount" />
              </div>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
