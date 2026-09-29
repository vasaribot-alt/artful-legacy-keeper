import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, ChevronDown, ChevronRight, Archive } from "lucide-react";

interface OrphanArtwork {
  id: string;
  artist_name: string;
  title: string | null;
  year: string | null;
  medium: string | null;
  support: string | null;
  dimensions: string | null;
  edition_info: string | null;
  image_url: string | null;
  source_institution: string | null;
  source_reference: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const emptyForm = {
  artist_name: "",
  title: "",
  year: "",
  medium: "",
  support: "",
  dimensions: "",
  edition_info: "",
  image_url: "",
  source_institution: "",
  source_reference: "",
  notes: "",
};

const statusLabel: Record<string, string> = {
  unclaimed: "Unclaimed",
  presented: "Presented",
  claimed: "Claimed",
  declined: "Declined",
};

export default function OrphanArtworks() {
  const [rows, setRows] = useState<OrphanArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orphan_artworks")
      .select("*")
      .order("artist_name")
      .order("year");
    if (error) toast.error(error.message);
    setRows((data as OrphanArtwork[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (r) =>
            r.artist_name.toLowerCase().includes(q) ||
            (r.title ?? "").toLowerCase().includes(q) ||
            (r.source_institution ?? "").toLowerCase().includes(q)
        )
      : rows;
    const map = new Map<string, OrphanArtwork[]>();
    for (const r of filtered) {
      const key = r.artist_name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, search]);

  const save = async () => {
    if (!form.artist_name.trim()) {
      toast.error("Artist name is required");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("orphan_artworks").insert({
      artist_name: form.artist_name.trim(),
      title: form.title.trim() || null,
      year: form.year.trim() || null,
      medium: form.medium.trim() || null,
      support: form.support.trim() || null,
      dimensions: form.dimensions.trim() || null,
      edition_info: form.edition_info.trim() || null,
      image_url: form.image_url.trim() || null,
      source_institution: form.source_institution.trim() || null,
      source_reference: form.source_reference.trim() || null,
      notes: form.notes.trim() || null,
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Work added to the bulk database");
    setDialogOpen(false);
    setForm(emptyForm);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("orphan_artworks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Foundation
            </p>
            <h1 className="text-3xl md:text-4xl leading-tight">Unclaimed Works</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Add work
          </Button>
        </div>
        <p className="text-muted-foreground max-w-2xl mb-8">
          Works reported by institutions and galleries before the artist has joined.
          They stay here until the artist claims them — nothing enters an artist's
          archive without their consent.
        </p>

        <Input
          placeholder="Search by artist, title or institution…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-6 max-w-md"
          autoComplete="off"
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Archive className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {rows.length === 0
                ? "No unclaimed works yet. Add the first one when an institution shares data."
                : "Nothing matches your search."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(([artist, works]) => {
              const isCollapsed = collapsed[artist] ?? false;
              const unclaimed = works.filter((w) => w.status === "unclaimed").length;
              return (
                <div key={artist} className="border border-border rounded-lg">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [artist]: !isCollapsed }))
                    }
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{artist}</span>
                      <span className="text-sm text-muted-foreground">
                        {works.length} work{works.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {unclaimed > 0 && (
                      <Badge variant="secondary">{unclaimed} unclaimed</Badge>
                    )}
                  </button>
                  {!isCollapsed && (
                    <div className="border-t border-border divide-y divide-border">
                      {works.map((w) => (
                        <div key={w.id} className="px-4 py-3 flex items-start gap-4">
                          {w.image_url && (
                            <img
                              src={w.image_url}
                              alt={w.title ?? ""}
                              className="h-14 w-14 object-cover rounded border border-border shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {w.title || "Untitled"}
                              {w.year ? ` (${w.year})` : ""}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {[w.medium, w.support, w.dimensions, w.edition_info]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Source: {w.source_institution || "—"}
                              {w.source_reference ? ` · ${w.source_reference}` : ""}
                            </p>
                          </div>
                          <Badge
                            variant={w.status === "claimed" ? "default" : "outline"}
                            className="shrink-0"
                          >
                            {statusLabel[w.status] ?? w.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => remove(w.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add work to the bulk database</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Artist name *"
                value={form.artist_name}
                onChange={(e) => setForm({ ...form, artist_name: e.target.value })}
                autoComplete="off"
              />
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                autoComplete="off"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Year"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  autoComplete="off"
                />
                <Input
                  placeholder="Medium"
                  value={form.medium}
                  onChange={(e) => setForm({ ...form, medium: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Support"
                  value={form.support}
                  onChange={(e) => setForm({ ...form, support: e.target.value })}
                  autoComplete="off"
                />
                <Input
                  placeholder="Dimensions"
                  value={form.dimensions}
                  onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <Input
                placeholder="Edition info"
                value={form.edition_info}
                onChange={(e) => setForm({ ...form, edition_info: e.target.value })}
                autoComplete="off"
              />
              <Input
                placeholder="Image URL"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                autoComplete="off"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Source institution"
                  value={form.source_institution}
                  onChange={(e) =>
                    setForm({ ...form, source_institution: e.target.value })
                  }
                  autoComplete="off"
                />
                <Input
                  placeholder="Source reference"
                  value={form.source_reference}
                  onChange={(e) =>
                    setForm({ ...form, source_reference: e.target.value })
                  }
                  autoComplete="off"
                />
              </div>
              <Textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <Button onClick={save} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add work
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
