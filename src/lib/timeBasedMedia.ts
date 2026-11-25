export const TIME_BASED_TYPES = ["Video art", "Performance"] as const;

export interface PerformanceEvent { date: string; place: string; performers: string }

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
      const ev = (v as PerformanceEvent[] | undefined ?? []).filter((e) => e.date.trim() || e.place.trim() || e.performers.trim());
      if (type === "Performance" && ev.length) out.events = ev;
    } else if (typeof v === "string") { if (v.trim()) out[k] = v.trim(); }
    else if (typeof v === "boolean") { if (v) out[k] = v; }
  }
  return Object.keys(out).length ? (out as TimeBasedDetails) : null;
}
