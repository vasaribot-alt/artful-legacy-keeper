import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

const COLLECTION = [
  { id: "GAWID-00100123", title: "Vapor I", year: 2025, src: "art1.jpg" },
  { id: "GAWID-00100147", title: "Vapor II", year: 2025, src: "art2.jpg" },
  { id: "GAWID-00100162", title: "Vapor III", year: 2026, src: "art3.jpg" },
  { id: "GAWID-00100188", title: "Vapor IV", year: 2026, src: "art4.jpg" },
  { id: "GAWID-00100201", title: "Vapor V", year: 2026, src: "art5.jpg" },
];

const PICKED = [0, 2, 3]; // indices of items that end up selected

export const SceneLinkArtworks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  // Popover opens at frame 30
  const popOpen = spring({ frame: frame - 30, fps, config: { damping: 22, stiffness: 130 } });

  // Items become selected at staggered frames
  const pickTimes = [70, 110, 150];

  // Badges fall in below at the same times
  const badgeS = (i: number) => spring({ frame: frame - pickTimes[i] - 4, fps, config: { damping: 18, stiffness: 130 } });

  // Popover closes at frame 200
  const popClose = interpolate(frame, [196, 218], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const popVisible = Math.min(popOpen, popClose);

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 400, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 03</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Link the<br/>artworks.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 20, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Pick from your catalogue. Each work carries its GAWID into the exhibition record.
        </div>
      </div>

      <div style={{
        width: 760, padding: "40px 48px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        position: "relative", minHeight: 540,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 26, color: theme.ink }}>Linked artworks</div>
          <div style={{
            padding: "8px 14px", border: `1px solid ${theme.ink}25`, borderRadius: 4,
            fontFamily: "DM Sans", fontSize: 13, color: theme.ink,
          }}>+ Add from catalogue</div>
        </div>

        {/* selected badges row */}
        <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12, minHeight: 96 }}>
          {PICKED.map((idx, i) => {
            const s = badgeS(i);
            if (s <= 0.01) return null;
            const item = COLLECTION[idx];
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px 8px 8px",
                background: theme.ink, color: theme.bg, borderRadius: 4,
                fontFamily: "DM Sans", fontSize: 13,
                opacity: s, transform: `translateY(${(1 - s) * 16}px) scale(${0.9 + s * 0.1})`,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 2, overflow: "hidden", background: theme.bgDeep }}>
                  <Img src={staticFile(`images/${item.src}`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                  <span style={{ fontSize: 14 }}>{item.title}</span>
                  <span style={{ fontSize: 10, opacity: 0.65, letterSpacing: "0.1em" }}>{item.id}</span>
                </div>
                <span style={{ opacity: 0.5, marginLeft: 4 }}>×</span>
              </div>
            );
          })}
        </div>

        {/* Popover picker */}
        {popVisible > 0.01 && (
          <div style={{
            position: "absolute", right: 48, top: 100, width: 380,
            background: theme.card, borderRadius: 8,
            border: `1px solid ${theme.ink}15`,
            boxShadow: "0 30px 70px -10px rgba(0,0,0,0.22)",
            opacity: popVisible, transform: `translateY(${(1 - popVisible) * -8}px)`,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: `1px solid ${theme.ink}10`,
              fontFamily: "DM Sans", fontSize: 11, color: theme.muted,
              letterSpacing: "0.18em", textTransform: "uppercase",
            }}>
              Your catalogue — 28 works
            </div>
            {COLLECTION.map((item, i) => {
              const pickedAt = PICKED.indexOf(i) >= 0 ? pickTimes[PICKED.indexOf(i)] : Infinity;
              const isSelected = frame >= pickedAt;
              const hovering = frame >= pickedAt - 14 && frame < pickedAt;
              const pulse = isSelected ? interpolate(frame, [pickedAt, pickedAt + 14], [1, 0], { extrapolateRight: "clamp" }) : 0;
              return (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                  background: hovering ? "#F3EFE8" : "transparent",
                  borderTop: i === 0 ? "none" : `1px solid ${theme.ink}08`,
                  fontFamily: "DM Sans",
                  position: "relative",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 3,
                    border: `1.5px solid ${isSelected ? theme.ink : theme.muted}`,
                    background: isSelected ? theme.ink : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: theme.bg, fontSize: 12,
                  }}>{isSelected ? "✓" : ""}</div>
                  <div style={{ width: 36, height: 36, borderRadius: 3, overflow: "hidden", background: theme.bgDeep }}>
                    <Img src={staticFile(`images/${item.src}`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} />
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: theme.ink }}>
                    {item.title}
                    <div style={{ fontSize: 10, color: theme.muted, letterSpacing: "0.08em" }}>{item.id} · {item.year}</div>
                  </div>
                  {pulse > 0 && (
                    <div style={{
                      position: "absolute", inset: 4, border: `2px solid ${theme.ink}`, borderRadius: 4,
                      opacity: pulse, transform: `scale(${1 + (1 - pulse) * 0.06})`,
                      pointerEvents: "none",
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
