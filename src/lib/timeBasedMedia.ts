export const TIME_BASED_TYPES = ["Video art", "Performance"] as const;

export interface PerformanceEvent { date: string; place: string; performers: string; commissioner?: string; link?: string; premiere?: boolean }

export interface TimeBasedDetails {
  masterFormat?: string; resolution?: string; duration?: string; sound?: string;
  masterHolder?: string; displayMode?: string; screens?: string; loop?: boolean;
  spaceRequirements?: string; migrationConsent?: string;
  events?: PerformanceEvent[]; recordedBy?: string; recordingRights?: string;
  score?: string; reperformance?: string; workStatement?: string;
}

export const isTimeBasedType = (t: string | null | undefined) =>
  !!t && (TIME_BASED_TYPES as readonly string[]).includes(t);

/** Drops empty values; returns null when nothing is filled in or type isn't time-based. */
export function cleanTimeBasedDetails(type: string, d: TimeBasedDetails): TimeBasedDetails | null {
  if (!isTimeBasedType(type)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    if (k === "events") {
      const ev = (v as PerformanceEvent[] | undefined ?? [])
        .filter((e) => [e.date, e.place, e.performers, e.commissioner ?? "", e.link ?? ""].some((x) => x.trim()))
        .map((e) => {
          const o: PerformanceEvent = { date: e.date.trim(), place: e.place.trim(), performers: e.performers.trim() };
          if (e.commissioner?.trim()) o.commissioner = e.commissioner.trim();
          if (e.link?.trim()) o.link = e.link.trim();
          if (e.premiere) o.premiere = true;
          return o;
        });
      if (type === "Performance" && ev.length) out.events = ev;
    } else if (typeof v === "string") { if (v.trim()) out[k] = v.trim(); }
    else if (typeof v === "boolean") { if (v) out[k] = v; }
  }
  return Object.keys(out).length ? (out as TimeBasedDetails) : null;
}
