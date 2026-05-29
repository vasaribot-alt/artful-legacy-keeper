import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const PortraitSVG: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ display: "block" }}>
    <defs>
      <linearGradient id="ppg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E8E4DD" />
        <stop offset="100%" stopColor="#C7C2BA" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#ppg)" />
    <circle cx="100" cy="78" r="34" fill="#0D0D0D" opacity="0.85" />
    <path d="M40 200 Q40 130 100 130 Q160 130 160 200 Z" fill="#0D0D0D" opacity="0.85" />
  </svg>
);

const CV_ROWS = [
  { year: "2024", text: "Solo exhibition, Kunsthalle Bergen" },
  { year: "2023", text: "Atlas — Group show, Tate Modern, London" },
  { year: "2022", text: "Residency, Cité Internationale des Arts, Paris" },
  { year: "2021", text: "MFA Fine Art, Royal College of Art, London" },
  { year: "2019", text: "BA Fine Art, Bergen Academy of Art and Design" },
];

export const SceneProfilePreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  // Scroll: hold a beat at top, scroll steadily, settle at end
  const scroll = interpolate(
    frame,
    [40, 70, 260],
    [0, 0, 780],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 400, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Live preview</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Your<br/>public<br/>profile.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Everything you entered, presented as a permanent archival record.
        </div>
      </div>

      {/* Browser-style frame with scroll viewport */}
      <div style={{
        width: 760, height: 720, background: theme.card, borderRadius: 12, overflow: "hidden",
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column",
      }}>
        {/* fake browser bar */}
        <div style={{
          height: 38, background: "#F0EDE6", borderBottom: `1px solid ${theme.ink}10`,
          display: "flex", alignItems: "center", padding: "0 14px", gap: 6,
          fontFamily: "DM Sans", fontSize: 12, color: theme.muted,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: "#D9D5CD" }} />
          <div style={{ width: 10, height: 10, borderRadius: 5, background: "#D9D5CD" }} />
          <div style={{ width: 10, height: 10, borderRadius: 5, background: "#D9D5CD" }} />
          <div style={{
            marginLeft: 16, padding: "3px 12px", background: theme.bg, borderRadius: 4,
            fontFamily: "DM Sans", fontSize: 12, color: theme.inkSoft, letterSpacing: "0.02em",
          }}>globalartistregistry.org/sasha-lindqvist</div>
        </div>

        {/* viewport */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative", background: theme.card }}>
          <div style={{
            position: "absolute", left: 0, right: 0, top: 0,
            transform: `translateY(${-scroll}px)`,
            padding: "44px 56px 60px",
            display: "flex", flexDirection: "column", gap: 36,
          }}>
            {/* hero: portrait + name */}
            <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
              <div style={{ width: 140, height: 140, borderRadius: 70, overflow: "hidden", flexShrink: 0 }}>
                <PortraitSVG />
              </div>
              <div>
                <div style={{ fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: theme.muted, marginBottom: 6 }}>GAR-00012487</div>
                <div style={{ fontFamily: "DM Serif Display", fontSize: 46, lineHeight: 1.05, color: theme.ink, letterSpacing: "-0.02em" }}>Sasha Lindqvist</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.inkSoft, marginTop: 6 }}>b. 1989 · Oslo, Norway</div>
              </div>
            </div>

            {/* bio */}
            <div>
              <div style={{ fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: theme.muted, marginBottom: 10 }}>Biography</div>
              <div style={{ fontFamily: "DM Serif Display", fontSize: 22, lineHeight: 1.45, color: theme.ink }}>
                Lives and works between Oslo and Lisbon.
              </div>
            </div>

            {/* meta row */}
            <div style={{ display: "flex", gap: 40 }}>
              <div>
                <div style={{ fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: theme.muted, marginBottom: 6 }}>Website</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 15, color: theme.ink }}>sashalindqvist.studio</div>
              </div>
              <div>
                <div style={{ fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: theme.muted, marginBottom: 6 }}>Social</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 15, color: theme.ink }}>@sasha.lindqvist · /in/sashalindqvist</div>
              </div>
            </div>

            {/* galleries */}
            <div>
              <div style={{ fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: theme.muted, marginBottom: 12 }}>Representation</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontFamily: "DM Serif Display", fontSize: 19, color: theme.ink }}>Galerie Nordlys</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 13, color: theme.muted }}>Oslo, Norway</div>
              </div>
            </div>

            {/* CV */}
            <div>
              <div style={{ fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: theme.muted, marginBottom: 14 }}>Curriculum Vitae</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {CV_ROWS.map((r) => (
                  <div key={r.year} style={{
                    display: "flex", gap: 22, padding: "14px 0",
                    borderBottom: `1px solid ${theme.ink}10`,
                    fontFamily: "DM Sans", fontSize: 15, color: theme.ink, alignItems: "baseline",
                  }}>
                    <div style={{ width: 56, fontFamily: "DM Serif Display", fontSize: 18, color: theme.ink }}>{r.year}</div>
                    <div style={{ flex: 1, color: theme.inkSoft }}>{r.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* footer mark */}
            <div style={{ marginTop: 14, paddingTop: 22, borderTop: `1px solid ${theme.ink}15`,
              fontFamily: "DM Sans", fontSize: 11, color: theme.muted, letterSpacing: "0.18em", textTransform: "uppercase",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>Global Artist Registry Foundation</span>
              <span>Verified · 2024</span>
            </div>
          </div>

          {/* scroll indicator */}
          <div style={{
            position: "absolute", right: 6, top: 12, bottom: 12, width: 3, background: `${theme.ink}08`, borderRadius: 2,
          }}>
            <div style={{
              position: "absolute", left: 0, right: 0, height: 80,
              top: interpolate(scroll, [0, 780], [0, 540]),
              background: `${theme.ink}40`, borderRadius: 2,
            }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
