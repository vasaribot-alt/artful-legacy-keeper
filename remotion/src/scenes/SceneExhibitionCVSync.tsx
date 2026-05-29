import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const SOLO = [
  { year: "2026", title: "Vapor — A Survey", venue: "Kunsthalle Köln", city: "Köln, DE", isNew: true },
  { year: "2024", title: "Slow Light", venue: "Galerie Eigen + Art", city: "Berlin, DE" },
  { year: "2022", title: "Veils", venue: "Cité Internationale des Arts", city: "Paris, FR" },
];

const GROUP = [
  { year: "2025", title: "Northern Surfaces", venue: "Museum Folkwang", city: "Essen, DE" },
  { year: "2023", title: "Atlas", venue: "Centre Pompidou", city: "Paris, FR" },
];

export const SceneExhibitionCVSync: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });

  // Card slides in
  const cardS = spring({ frame, fps, config: { damping: 24, stiffness: 100 } });

  // The new 2026 row "drops" into the CV with a highlight pulse
  const newRowS = spring({ frame: frame - 50, fps, config: { damping: 20, stiffness: 110 } });
  const newRowPulse = interpolate(frame, [60, 90, 130], [0, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Tag arrow drawn from "exhibition saved" to "CV row"
  const arrowD = interpolate(frame, [70, 110], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 380, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 05</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Synced to<br/>your <span style={{ fontStyle: "italic" }}>CV.</span>
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 20, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Every exhibition you save is filed automatically — Solo, Group, or Two-person — into your archival CV.
        </div>
      </div>

      <div style={{
        width: 820, padding: "44px 56px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        position: "relative", minHeight: 560,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: "DM Sans", fontSize: 11, color: theme.muted, letterSpacing: "0.2em", textTransform: "uppercase" }}>Curriculum Vitae</div>
            <div style={{ fontFamily: "DM Serif Display", fontSize: 30, color: theme.ink, marginTop: 4 }}>Elin Vandermeer</div>
          </div>
          <div style={{
            padding: "6px 12px", border: `1px solid ${theme.ink}25`, borderRadius: 3,
            fontFamily: "DM Sans", fontSize: 11, color: theme.ink, letterSpacing: "0.15em", textTransform: "uppercase",
          }}>Auto-synced</div>
        </div>

        {/* Solo Exhibitions */}
        <div style={{
          fontFamily: "DM Sans", fontSize: 11, color: theme.muted,
          letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 12,
        }}>
          Solo Exhibitions
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {SOLO.map((row, i) => {
            const isNew = row.isNew;
            const baseOp = isNew ? newRowS : 1;
            const translate = isNew ? (1 - newRowS) * 14 : 0;
            return (
              <div key={row.title} style={{
                display: "grid", gridTemplateColumns: "70px 1fr 220px", gap: 16,
                padding: "14px 4px",
                borderTop: i === 0 ? `1px solid ${theme.ink}15` : `1px solid ${theme.ink}08`,
                fontFamily: "DM Sans", fontSize: 16, color: theme.ink,
                opacity: baseOp, transform: `translateY(${translate}px)`,
                position: "relative",
              }}>
                <div style={{ fontFamily: "DM Serif Display", fontSize: 19 }}>{row.year}</div>
                <div>
                  <div>{row.title}</div>
                  <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{row.venue}</div>
                </div>
                <div style={{ color: theme.inkSoft, fontSize: 14, textAlign: "right" }}>{row.city}</div>

                {isNew && newRowPulse > 0 && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `${theme.ink}10`,
                    opacity: newRowPulse,
                    pointerEvents: "none",
                  }} />
                )}
                {isNew && (
                  <div style={{
                    position: "absolute", right: -110, top: 14,
                    fontFamily: "DM Sans", fontSize: 10, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: theme.ink,
                    padding: "4px 8px", border: `1px solid ${theme.ink}`,
                    opacity: interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" }),
                  }}>
                    New
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Group */}
        <div style={{
          fontFamily: "DM Sans", fontSize: 11, color: theme.muted,
          letterSpacing: "0.22em", textTransform: "uppercase", margin: "28px 0 12px",
        }}>
          Group Exhibitions
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {GROUP.map((row, i) => (
            <div key={row.title} style={{
              display: "grid", gridTemplateColumns: "70px 1fr 220px", gap: 16,
              padding: "14px 4px",
              borderTop: i === 0 ? `1px solid ${theme.ink}15` : `1px solid ${theme.ink}08`,
              fontFamily: "DM Sans", fontSize: 16, color: theme.ink,
            }}>
              <div style={{ fontFamily: "DM Serif Display", fontSize: 19 }}>{row.year}</div>
              <div>
                <div>{row.title}</div>
                <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{row.venue}</div>
              </div>
              <div style={{ color: theme.inkSoft, fontSize: 14, textAlign: "right" }}>{row.city}</div>
            </div>
          ))}
        </div>

        {/* arrow from card edge toward new row */}
        <svg width="120" height="80" viewBox="0 0 120 80" style={{
          position: "absolute", left: -110, top: 158,
          opacity: arrowD,
        }}>
          <path
            d="M 8 70 C 40 70, 60 40, 110 20"
            stroke={theme.ink} strokeWidth="1.5" fill="none"
            strokeDasharray="200"
            strokeDashoffset={(1 - arrowD) * 200}
          />
          <path d="M 102 14 L 112 20 L 104 28" stroke={theme.ink} strokeWidth="1.5" fill="none"
            opacity={arrowD > 0.8 ? 1 : 0} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
