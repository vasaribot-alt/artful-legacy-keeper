import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Link2, MousePointerClick, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type TrackedLink = {
  id: string;
  code: string;
  destination: string;
  label: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  created_at: string;
};

export type TrackedLinkClick = {
  id: string;
  link_id: string;
  clicked_at: string;
  country: string | null;
  device: string | null;
  referrer: string | null;
};

export const TRACKED_DESTINATIONS = [
  { value: "https://globalartistregistry.org/alliance/curators", label: "Alliance — Curators" },
  { value: "https://globalartistregistry.org/invitation", label: "Artist invitation (all languages)" },
  { value: "https://globalartistregistry.org/founding-artists", label: "Legacy Artists registry" },
  { value: "https://globalartistregistry.org/about", label: "About the Foundation" },
  { value: "https://globalartistregistry.org/faq", label: "FAQ" },
  { value: "https://globalartistregistry.org/registrars", label: "Registrar directory" },
  { value: "https://globalartistregistry.org/donate", label: "Donate" },
  { value: "https://globalartistregistry.org/", label: "Home page" },
];

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(length = 7) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");
}

export function trackedLinkUrl(code: string) {
  const origin =
    typeof window !== "undefined" && window.location.hostname.endsWith("globalartistregistry.org")
      ? window.location.origin
      : "https://globalartistregistry.org";
  return `${origin}/r/${code}`;
}

type Props = {
  sourceTable: string;
  sourceId: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
};

export default function TrackedLinkPanel({
  sourceTable,
  sourceId,
  recipientName,
  recipientEmail,
}: Props) {
  const [links, setLinks] = useState<TrackedLink[]>([]);
  const [clicks, setClicks] = useState<TrackedLinkClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [destination, setDestination] = useState(TRACKED_DESTINATIONS[0].value);
  const [customUrl, setCustomUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: linkRows, error } = await supabase
      .from("tracked_links")
      .select("id, code, destination, label, recipient_name, recipient_email, created_at")
      .eq("source_table", sourceTable)
      .eq("source_id", sourceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load tracked links", error);
      toast.error("Could not load tracked links.");
      setLoading(false);
      return;
    }

    const list = (linkRows ?? []) as TrackedLink[];
    setLinks(list);

    if (list.length) {
      const { data: clickRows, error: clickError } = await supabase
        .from("tracked_link_clicks")
        .select("id, link_id, clicked_at, country, device, referrer")
        .in("link_id", list.map((l) => l.id))
        .order("clicked_at", { ascending: false });
      if (clickError) {
        console.error("Failed to load clicks", clickError);
      } else {
        setClicks((clickRows ?? []) as TrackedLinkClick[]);
      }
    } else {
      setClicks([]);
    }
    setLoading(false);
  }, [sourceTable, sourceId]);

  useEffect(() => {
    load();
  }, [load]);

  const clicksByLink = useMemo(() => {
    const map = new Map<string, TrackedLinkClick[]>();
    for (const click of clicks) {
      const list = map.get(click.link_id) ?? [];
      list.push(click);
      map.set(click.link_id, list);
    }
    return map;
  }, [clicks]);

  const handleCreate = async () => {
    const target = destination === "__custom" ? customUrl.trim() : destination;
    if (!/^https?:\/\/.+/i.test(target)) {
      toast.error("Please enter a full URL starting with https://");
      return;
    }
    setCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You need to be signed in.");

      const known = TRACKED_DESTINATIONS.find((d) => d.value === target);
      const { error } = await supabase.from("tracked_links").insert({
        code: makeCode(),
        destination: target,
        label: known?.label ?? target.replace(/^https?:\/\//, ""),
        source_table: sourceTable,
        source_id: sourceId,
        recipient_name: recipientName ?? null,
        recipient_email: recipientEmail ?? null,
        created_by: userId,
      });
      if (error) throw error;
      setCustomUrl("");
      await load();
      toast.success("Tracked link created. Copy it into your email.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not create the link.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tracked_links").delete().eq("id", id);
    if (error) {
      console.error(error);
      toast.error("Could not delete the link.");
      return;
    }
    await load();
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(trackedLinkUrl(code));
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy. Select the link and copy manually.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1 space-y-2">
          <Label>Destination</Label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACKED_DESTINATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
              <SelectItem value="__custom">Other URL…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {destination === "__custom" && (
          <div className="flex-1 space-y-2">
            <Label htmlFor="customUrl">Custom URL</Label>
            <Input
              id="customUrl"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://globalartistregistry.org/…"
              autoComplete="off"
            />
          </div>
        )}
        <Button onClick={handleCreate} disabled={creating}>
          <Link2 className="w-4 h-4 mr-2" />
          {creating ? "Creating…" : "Create tracked link"}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tracked links…</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tracked links yet. Create one and use it in the email instead of the plain URL, then every
          visit is recorded here.
        </p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => {
            const linkClicks = clicksByLink.get(link.id) ?? [];
            const humanClicks = linkClicks.filter((c) => c.device !== "bot");
            const last = humanClicks[0] ?? linkClicks[0];
            return (
              <li key={link.id} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{link.label}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {trackedLinkUrl(link.code)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={humanClicks.length ? "default" : "secondary"}>
                      <MousePointerClick className="w-3 h-3 mr-1" />
                      {humanClicks.length} {humanClicks.length === 1 ? "visit" : "visits"}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => copy(link.code)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(link.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {last && (
                  <p className="text-xs text-muted-foreground">
                    Last visit {new Date(last.clicked_at).toLocaleString()}
                    {last.country ? ` · ${last.country}` : ""}
                    {last.device ? ` · ${last.device}` : ""}
                    {linkClicks.length !== humanClicks.length
                      ? ` · ${linkClicks.length - humanClicks.length} automated preview(s) ignored`
                      : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
