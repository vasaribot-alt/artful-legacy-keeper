import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const GRID = [
  { title: "Untitled (Vapor)", year: 2024, tone: "#3a3a3a", medium: "Oil on linen" },
  { title: "Nocturne IV",      year: 2023, tone: "#1a1a1a", medium: "Photograph" },
  { title: "Pale Field",       year: 2023, tone: "#c7c2ba", medium: "Acrylic" },
  { title: "Slow Light",       year: 2022, tone: "#5a5a5a", medium: "Oil on canvas" },
  { title: "Margin Study",     year: 2022, tone: "#e8e4dd", medium: "Graphite" },
  { title: "Soft Inventory",   year: 2021, tone: "#6e6962", medium: "Mixed media" },
];

export const SceneCatalogueGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });

  // Success banner
  const bannerS = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 130 } });

  // Cards stagger in
  const cardDelay = 18;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 360, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Done</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Your<br/>catalogue.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Every work — searchable, editable, archived.
        </div>
      </div>

      <div style={{
        width: 900, padding: "36px 40px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        opacity: bannerS, transform: `translateY(${(1 - bannerS) * 60}px)`,
      }}>
        {/* success banner */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14, paddingBottom: 22,
          borderBottom: `1px solid ${theme.ink}10`, marginBottom: 26,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16, background: theme.ink, color: theme.bg,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>✓</div>
          <div>
            <div style={{ fontFamily: "DM Serif Display", fontSize: 22, color: theme.ink }}>5 artworks imported</div>
            <div style={{ fontFamily: "DM Sans", fontSize: 13, color: theme.muted, marginTop: 2 }}>
              All images matched · ready in your catalogue
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {GRID.map((g, i) => {
            const d = cardDelay + i * 7;
            const s = spring({ frame: frame - d, fps, config: { damping: 22, stiffness: 130 } });
            return (
              <div key={g.title} style={{
                opacity: s, transform: `translateY(${(1 - s) * 14}px)`,
              }}>
                <div style={{
                  width: "100%", aspectRatio: "4/5", background: g.tone, borderRadius: 4,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.12) 100%)`,
                  }} />
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontFamily: "DM Serif Display", fontSize: 17, color: theme.ink, lineHeight: 1.2 }}>{g.title}</div>
                  <div style={{ fontFamily: "DM Sans", fontSize: 12, color: theme.muted, marginTop: 4, letterSpacing: "0.05em" }}>
                    {g.year} · {g.medium}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
