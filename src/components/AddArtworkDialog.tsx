import { useState, useEffect } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [editionCount, setEditionCount] = useState("");
  const [artistProofs, setArtistProofs] = useState("");
  const [loading, setLoading] = useState(false);

  // Series dropdown state
  const [seriesOptions, setSeriesOptions] = useState<string[]>([]);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [newSeriesInput, setNewSeriesInput] = useState("");

  useEffect(() => {
    if (open) fetchSeriesOptions();
  }, [open]);

  const fetchSeriesOptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("series_groups")
      .select("name")
      .eq("user_id", user.id)
      .order("name");
    if (data) setSeriesOptions(data.map((d) => d.name));
  };

  const addNewSeries = async () => {
    const name = newSeriesInput.trim();
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("series_groups").insert({ user_id: user.id, name });
    if (error) {
      if (error.code === "23505") toast.error("Series already exists");
      else toast.error("Failed to add series");
      return;
    }
    setSeriesOptions((prev) => [...prev, name].sort());
    setSeries(name);
    setNewSeriesInput("");
  };

  const resetForm = () => {
    setTitle(""); setArtworkType(""); setMedium(""); setYear(""); setDescription("");
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
      artwork_type: artworkType || null,
      medium: medium.trim() || null,
      year: year ? parseInt(year) : null,
      description: description.trim() || null,
      is_unique: isUnique,
      series: series.trim() || null,
      sub_category: subCategory || null,
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
      // Save new series to series_groups if not already there
      if (series.trim() && !seriesOptions.includes(series.trim())) {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          await supabase.from("series_groups").insert({ user_id: u.id, name: series.trim() }).select();
          fetchSeriesOptions();
        }
      }
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

          <div>
            <Label>Type of artwork</Label>
            <Select value={artworkType} onValueChange={(v) => { setArtworkType(v); if (v !== "Sculpture") setSubCategory(""); }}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {artworkTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {artworkType === "Sculpture" && (
            <div>
              <Label>Sculpture sub-category</Label>
              <Select value={subCategory} onValueChange={setSubCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select sub-category" />
                </SelectTrigger>
                <SelectContent>
                  {sculptureSubCategories.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year">Date of creation</Label>
              <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2024" className="mt-1.5" />
            </div>
            <div>
              <Label>Series / Group</Label>
              <Popover open={seriesOpen} onOpenChange={setSeriesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={seriesOpen}
                    className="w-full justify-between mt-1.5 font-normal"
                  >
                    {series || "Select or add..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-2" align="start">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {seriesOptions.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">No series yet</p>
                    )}
                    {seriesOptions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent",
                          series === s && "bg-accent"
                        )}
                        onClick={() => { setSeries(s); setSeriesOpen(false); }}
                      >
                        <Check className={cn("h-3 w-3", series === s ? "opacity-100" : "opacity-0")} />
                        {s}
                      </button>
                    ))}
                  </div>
                  <Separator className="my-2" />
                  <div className="flex gap-1">
                    <Input
                      value={newSeriesInput}
                      onChange={(e) => setNewSeriesInput(e.target.value)}
                      placeholder="New series name"
                      className="h-8 text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewSeries(); } }}
                    />
                    <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={addNewSeries}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
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
