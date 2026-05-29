import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const typed = (full: string, frame: number, start: number, perChar = 1.6) => {
  const n = Math.max(0, Math.floor((frame - start) / perChar));
  return full.slice(0, Math.min(n, full.length));
};

export const SceneExhibitionNew: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  const title = typed("Vapor — A Survey", frame, 24);
  const venue = typed("Kunsthalle Köln", frame, 78);
  const city = typed("Köln, DE", frame, 122);
  const curator = typed("Lior Hessel", frame, 162);
  const dateRange = typed("14 Mar — 02 Jun 2026", frame, 196);

  // Solo / Group toggle — picks "Solo" at frame 240
  const toggled = frame > 240;
  const togglePulse = interpolate(frame, [240, 252, 268], [0, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ width: 420, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 01</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          New<br/>exhibition.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Venue, city, dates, curator — the essential record.
        </div>
      </div>

      <div style={{
        width: 760, padding: "52px 60px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column", gap: 22,
      }}>
        <div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 30, color: theme.ink }}>Exhibition details</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.muted, marginTop: 4 }}>Stored as a relational record.</div>
        </div>

        <Field label="EXHIBITION TITLE *" value={title} cursor={frame < 78} big />
        <Field label="VENUE" value={venue} cursor={frame > 78 && frame < 122} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="CITY, COUNTRY" value={city} cursor={frame > 122 && frame < 162} />
          <Field label="CURATOR" value={curator} cursor={frame > 162 && frame < 196} />
        </div>

        <Field label="DATES" value={dateRange} cursor={frame > 196 && frame < 232} />

        {/* Solo / Group toggle */}
        <div>
          <div style={{ fontSize: 10, color: theme.muted, marginBottom: 8, letterSpacing: "0.18em" }}>SHOW TYPE</div>
          <div style={{ display: "inline-flex", border: `1px solid ${theme.ink}20`, borderRadius: 6, overflow: "hidden", position: "relative" }}>
            <Pill active={toggled} label="Solo" pulse={toggled ? togglePulse : 0} />
            <Pill active={false} label="Group" pulse={0} />
            <Pill active={false} label="Two-person" pulse={0} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Field: React.FC<{ label: string; value: string; cursor?: boolean; big?: boolean }> = ({ label, value, cursor, big }) => (
  <div>
    <div style={{ fontSize: 10, color: theme.muted, marginBottom: 6, letterSpacing: "0.18em" }}>{label}</div>
    <div style={{
      height: big ? 56 : 46, borderBottom: `1.5px solid ${theme.ink}`,
      display: "flex", alignItems: "center",
      fontSize: big ? 26 : 19, color: theme.ink,
      fontFamily: big ? "DM Serif Display" : "DM Sans",
    }}>
      <span>
        {value}
        {cursor && <span style={{ color: theme.ink, marginLeft: 2 }}>|</span>}
      </span>
    </div>
  </div>
);

const Pill: React.FC<{ active: boolean; label: string; pulse: number }> = ({ active, label, pulse }) => (
  <div style={{
    padding: "10px 22px",
    background: active ? theme.ink : "transparent",
    color: active ? theme.bg : theme.inkSoft,
    fontFamily: "DM Sans", fontSize: 14, position: "relative",
  }}>
    {label}
    {pulse > 0 && (
      <div style={{
        position: "absolute", inset: -4, border: `2px solid ${theme.ink}`, borderRadius: 8,
        opacity: 1 - pulse, transform: `scale(${1 + pulse * 0.4})`, pointerEvents: "none",
      }} />
    )}
  </div>
);
