import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { TimeBasedDetails, PerformanceEvent } from "@/lib/timeBasedMedia";

interface Props { type: string; value: TimeBasedDetails; onChange: (v: TimeBasedDetails) => void }

export function TimeBasedMediaFields({ type, value, onChange }: Props) {
  const set = (k: keyof TimeBasedDetails, v: unknown) => onChange({ ...value, [k]: v });
  const events = value.events ?? [];
  const setEvent = (i: number, k: "date" | "place" | "performers" | "commissioner" | "link", v: string) =>
    set("events", events.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const text = (k: keyof TimeBasedDetails, label: string, placeholder = "") => (
    <div>
      <Label>{label}</Label>
      <Input autoComplete="off" className="mt-1.5" placeholder={placeholder}
        value={(value[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />
    </div>
  );
  const area = (k: keyof TimeBasedDetails, label: string, placeholder = "") => (
    <div>
      <Label>{label}</Label>
      <Textarea autoComplete="off" className="mt-1.5" rows={3} placeholder={placeholder}
        value={(value[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />
    </div>
  );
  const isVideo = type === "Video art";

  return (
    <div className="space-y-4 border border-border rounded-md p-4">
      <p className="text-sm font-medium">{isVideo ? "Video art documentation" : "Performance documentation"}</p>

      {isVideo ? (
        <>
          <div>
            <Label htmlFor="tbm-video-url">Video link</Label>
            <Input id="tbm-video-url" type="url" autoComplete="off" className="mt-1.5"
              placeholder="https://vimeo.com/… or https://youtube.com/…"
              value={value.videoUrl ?? ""} onChange={(e) => set("videoUrl", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {text("masterFormat", "Master file format", "e.g. ProRes 422, MP4")}
            {text("resolution", "Resolution", "e.g. 1920×1080")}
            {text("duration", "Duration", "e.g. 12 min 30 s")}
            {text("sound", "Sound", "e.g. stereo, silent")}
          </div>
          {text("masterHolder", "Who holds the original master")}
          <div className="grid grid-cols-2 gap-3">
            {text("displayMode", "Display", "Projection or monitor")}
            {text("screens", "Number of screens / channels")}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!value.loop} onCheckedChange={(c) => set("loop", c)} id="tbm-loop" />
            <Label htmlFor="tbm-loop">Shown on loop</Label>
          </div>
          {area("spaceRequirements", "Room and installation requirements")}
          {area("migrationConsent", "If equipment becomes outdated", "What the artist accepts, e.g. moving to a new file format or display")}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Performances</Label>
            {events.map((e, i) => (
              <div key={i} className="space-y-2 rounded-md border border-border p-3">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                  <Input autoComplete="off" placeholder="Date" value={e.date} onChange={(x) => setEvent(i, "date", x.target.value)} />
                  <Input autoComplete="off" placeholder="Place / event" value={e.place} onChange={(x) => setEvent(i, "place", x.target.value)} />
                  <Input autoComplete="off" placeholder="Performers" value={e.performers} onChange={(x) => setEvent(i, "performers", x.target.value)} />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove performance"
                    onClick={() => set("events", events.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input autoComplete="off" placeholder="Commissioned / co-produced by" value={e.commissioner ?? ""} onChange={(x) => setEvent(i, "commissioner", x.target.value)} />
                  <Input autoComplete="off" type="url" placeholder="Link (press, tickets, video)" value={e.link ?? ""} onChange={(x) => setEvent(i, "link", x.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={!!e.premiere}
                    onChange={(x) => set("events", events.map((ev, j) => (j === i ? { ...ev, premiere: x.target.checked } : ev)))} />
                  First performance (premiere)
                </label>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => set("events", [...events, { date: "", place: "", performers: "" }])}>
              <Plus className="h-4 w-4 mr-1" /> Add performance
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {text("recordedBy", "Filmed / photographed by")}
            {text("recordingRights", "Who owns the recording rights")}
          </div>
          {area("score", "Artist's instructions (score)")}
          {area("reperformance", "May others perform it again?", "e.g. only with the artist's permission")}
        </>
      )}
      {area("workStatement", "What is the artwork, and what is documentation of it?", "The artist's own statement")}
    </div>
  );
}
