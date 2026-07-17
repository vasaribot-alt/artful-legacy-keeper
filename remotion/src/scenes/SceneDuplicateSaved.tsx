import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { theme } from "../theme";

// Final: the new work appears in the grid next to the original.
export const SceneDuplicateSaved: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridIn = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });

  // New card highlight pulse
  const newAt = 40;
  const newS = spring({ frame: frame - newAt, fps, config: { damping: 18, stiffness: 90 } });
  const pulse = interpolate(frame, [newAt + 20, newAt + 40, newAt + 60], [0, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const artworks = [
    { src: "images/art1.jpg", title: "Untitled (Vapor)", meta: "2024 · Oil" },
    { src: "images/art5.jpg", title: "Untitled (Vapor) II", meta: "2024 · Oil", isNew: true },
    { src: "images/art2.jpg", title: "Slow Green", meta: "2023 · Acrylic" },
    { src: "images/art3.jpg", title: "Field Notes", meta: "2024 · Ink" },
    { src: "images/art4.jpg", title: "Passage", meta: "2022 · Oil" },
    { src: "images/art1.jpg", title: "Study I", meta: "2023 · Charcoal" },
  ];

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 1200,
        opacity: gridIn,
        transform: `translateY(${(1 - gridIn) * 30}px)`,
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.25em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 10,
        }}>Dashboard · Updated</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 46, color: theme.ink,
          marginBottom: 34, letterSpacing: "-0.02em",
        }}>Archived.</div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28,
        }}>
          {artworks.map((art, i) => {
            const cardS = art.isNew
              ? newS
              : spring({ frame: frame - i * 3, fps, config: { damping: 22 } });
            return (
              <div key={i} style={{
                opacity: cardS,
                transform: `translateY(${(1 - cardS) * 20}px)`,
              }}>
                <div style={{
                  position: "relative", aspectRatio: "1", borderRadius: 4, overflow: "hidden",
                  background: theme.card,
                  boxShadow: art.isNew
                    ? `0 0 0 ${pulse * 4}px ${theme.ink}25, 0 20px 40px -12px rgba(0,0,0,0.2)`
                    : "0 4px 10px -4px rgba(0,0,0,0.08)",
                }}>
                  <Img src={staticFile(art.src)} style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    filter: "grayscale(100%)",
                  }} />
                  {art.isNew && (
                    <div style={{
                      position: "absolute", top: 12, left: 12,
                      padding: "5px 10px", borderRadius: 3,
                      background: theme.ink, color: theme.card,
                      fontFamily: "DM Sans", fontSize: 10, letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      opacity: interpolate(frame, [newAt + 10, newAt + 26], [0, 1], { extrapolateRight: "clamp" }),
                    }}>New</div>
                  )}
                </div>
                <div style={{ marginTop: 10, fontFamily: "DM Sans" }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: art.isNew ? theme.ink : theme.ink,
                  }}>{art.title}</div>
                  <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{art.meta}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Closing caption */}
      <div style={{
        position: "absolute", left: 110, bottom: 130, maxWidth: 380,
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.25em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 12,
          opacity: interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" }),
        }}>Done</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 52, lineHeight: 1.05,
          color: theme.ink, letterSpacing: "-0.02em",
          opacity: interpolate(frame, [18, 50], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Same data.<br/>New <span style={{ fontStyle: "italic" }}>work.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
