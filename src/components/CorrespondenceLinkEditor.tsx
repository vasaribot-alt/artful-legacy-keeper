import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Check, Images, Calendar } from "lucide-react";
import { toast } from "sonner";

interface LinkRow {
  id: string;
  artwork_id: string | null;
  exhibition_id: string | null;
  status: string;
  confidence: number | null;
  reasoning: string | null;
  artworks?: { title: string | null; global_artwork_id: number | null } | null;
  exhibitions?: { title: string | null } | null;
}

interface Target { id: string; label: string }

export function CorrespondenceLinkEditor({ messageId }: { messageId: string }) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [artworks, setArtworks] = useState<Target[]>([]);
  const [exhibitions, setExhibitions] = useState<Target[]>([]);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("correspondence_links")
      .select("id, artwork_id, exhibition_id, status, confidence, reasoning, artworks(title, global_artwork_id), exhibitions(title)")
      .eq("message_id", messageId)
      .neq("status", "rejected");
    setLinks((data ?? []) as unknown as LinkRow[]);
  };

  useEffect(() => {
    load();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const [aw, ex] = await Promise.all([
        supabase.from("artworks").select("id, title, year").eq("owner_id", uid).order("title").limit(500),
        supabase.from("exhibitions").select("id, title, opening_date").eq("user_id", uid).order("opening_date", { ascending: false }).limit(300),
      ]);
      setArtworks((aw.data ?? []).map((a) => ({ id: a.id, label: `${a.title ?? "Untitled"}${a.year ? ` (${a.year})` : ""}` })));
      setExhibitions((ex.data ?? []).map((e) => ({ id: e.id, label: e.title ?? "Untitled exhibition" })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  const addLink = async (kind: "artwork" | "exhibition", targetId: string) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const { error } = await supabase.from("correspondence_links").insert({
      message_id: messageId,
      owner_id: uid,
      artwork_id: kind === "artwork" ? targetId : null,
      exhibition_id: kind === "exhibition" ? targetId : null,
      status: "confirmed",
    });
    if (error && !/duplicate key/i.test(error.message)) {
      toast.error("Could not link", { description: error.message });
      return;
    }
    setOpen(false);
    setFilter("");
    load();
  };

  const setStatus = async (id: string, status: "confirmed" | "rejected") => {
    const { error } = await supabase.from("correspondence_links").update({ status }).eq("id", id);
    if (error) { toast.error("Could not update", { description: error.message }); return; }
    load();
  };

  const removeLink = async (id: string) => {
    await supabase.from("correspondence_links").delete().eq("id", id);
    load();
  };

  const f = filter.trim().toLowerCase();
  const filteredArtworks = f ? artworks.filter((a) => a.label.toLowerCase().includes(f)) : artworks.slice(0, 40);
  const filteredExhibitions = f ? exhibitions.filter((e) => e.label.toLowerCase().includes(f)) : exhibitions.slice(0, 20);

  return (
    <div className="space-y-2">
      {links.length === 0 && <p className="text-xs text-muted-foreground">No linked artworks or exhibitions yet.</p>}

      <div className="flex flex-wrap gap-1.5">
        {links.map((l) => {
          const label = l.artwork_id
            ? l.artworks?.title ?? "Artwork"
            : l.exhibitions?.title ?? "Exhibition";
          const suggested = l.status === "suggested";
          return (
            <Badge key={l.id} variant={suggested ? "outline" : "secondary"} className="gap-1 py-1">
              {l.artwork_id ? <Images className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
              <span className="max-w-[220px] truncate">{label}</span>
              {suggested ? (
                <>
                  <span className="text-[10px] text-muted-foreground">suggested</span>
                  <button onClick={() => setStatus(l.id, "confirmed")} aria-label="Confirm link" className="hover:text-foreground">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={() => setStatus(l.id, "rejected")} aria-label="Reject link" className="hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <button onClick={() => removeLink(l.id)} aria-label="Remove link" className="hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          );
        })}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs"><Plus className="w-3 h-3" /> Link</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-2 border-b border-border">
              <Input placeholder="Search artworks and exhibitions…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8" />
            </div>
            <div className="max-h-64 overflow-y-auto py-1" onWheel={(e) => e.stopPropagation()}>
              {filteredArtworks.length > 0 && (
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Artworks</div>
              )}
              {filteredArtworks.map((a) => (
                <button key={a.id} onClick={() => addLink("artwork", a.id)} className="w-full text-left px-2 py-1.5 text-sm hover:bg-secondary truncate">
                  {a.label}
                </button>
              ))}
              {filteredExhibitions.length > 0 && (
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Exhibitions</div>
              )}
              {filteredExhibitions.map((e) => (
                <button key={e.id} onClick={() => addLink("exhibition", e.id)} className="w-full text-left px-2 py-1.5 text-sm hover:bg-secondary truncate">
                  {e.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
