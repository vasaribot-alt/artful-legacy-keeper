import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { theme } from "../theme";

// Scene: user hovers a card in the dashboard grid, a copy icon appears, they click it.
export const SceneDuplicateHover: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridIn = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });

  const hoverStart = 40;
  const tapStart = 90;
  const hoverO = interpolate(frame, [hoverStart, hoverStart + 18], [0, 1], { extrapolateRight: "clamp" });
  const tapO = interpolate(frame, [tapStart, tapStart + 8, tapStart + 30], [0, 1, 0], { extrapolateRight: "clamp" });
  const tapScale = interpolate(frame, [tapStart, tapStart + 30], [0.4, 2.2], { extrapolateRight: "clamp" });
  const pressed = frame > tapStart && frame < tapStart + 14;

  const artworks = [
    { src: "images/art1.jpg", title: "Untitled (Vapor)", meta: "2024 · Oil" },
    { src: "images/art2.jpg", title: "Slow Green", meta: "2023 · Acrylic" },
    { src: "images/art3.jpg", title: "Field Notes", meta: "2024 · Ink" },
    { src: "images/art4.jpg", title: "Passage", meta: "2022 · Oil" },
    { src: "images/art5.jpg", title: "Blue Hour", meta: "2024 · Oil" },
    { src: "images/art1.jpg", title: "Study I", meta: "2023 · Charcoal" },
  ];

  const focusIndex = 0;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Dashboard-like grid */}
      <div style={{
        width: 1200,
        opacity: gridIn,
        transform: `translateY(${(1 - gridIn) * 30}px)`,
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.25em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 10,
        }}>Dashboard · My works</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 46, color: theme.ink,
          marginBottom: 34, letterSpacing: "-0.02em",
        }}>Artworks</div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28,
        }}>
          {artworks.map((art, i) => {
            const isFocus = i === focusIndex;
            const cardS = spring({ frame: frame - i * 4, fps, config: { damping: 22 } });
            const lift = isFocus ? hoverO * -6 : 0;
            const scale = isFocus && pressed ? 0.985 : 1;
            return (
              <div key={i} style={{
                opacity: cardS,
                transform: `translateY(${(1 - cardS) * 20 + lift}px) scale(${scale})`,
              }}>
                <div style={{
                  position: "relative", aspectRatio: "1", borderRadius: 4, overflow: "hidden",
                  background: theme.card,
                  boxShadow: isFocus
                    ? `0 20px 40px -12px rgba(0,0,0,${0.05 + hoverO * 0.18})`
                    : "0 4px 10px -4px rgba(0,0,0,0.08)",
                }}>
                  <Img src={staticFile(art.src)} style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    filter: "grayscale(100%)",
                    transform: isFocus ? `scale(${1 + hoverO * 0.04})` : "scale(1)",
                  }} />

                  {/* Copy icon button (appears on hover) */}
                  {isFocus && (
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      width: 34, height: 34, borderRadius: 6,
                      background: `${theme.card}ee`,
                      border: `1px solid ${theme.ink}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: hoverO,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                    }}>
                      {/* Copy glyph */}
                      <div style={{ position: "relative", width: 16, height: 16 }}>
                        <div style={{
                          position: "absolute", top: 0, left: 3, width: 11, height: 13,
                          border: `1.6px solid ${theme.ink}`, borderRadius: 2,
                        }} />
                        <div style={{
                          position: "absolute", top: 3, left: 0, width: 11, height: 13,
                          border: `1.6px solid ${theme.ink}`, borderRadius: 2,
                          background: theme.card,
                        }} />
                      </div>

                      {/* Tap ripple */}
                      <div style={{
                        position: "absolute", top: "50%", left: "50%",
                        width: 60, height: 60, borderRadius: "50%",
                        border: `2px solid ${theme.ink}`,
                        transform: `translate(-50%, -50%) scale(${tapScale})`,
                        opacity: tapO * 0.5,
                      }} />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10, fontFamily: "DM Sans" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.ink }}>{art.title}</div>
                  <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{art.meta}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cursor moving toward the copy button on the first card */}
      {(() => {
        // Origin (approx center of viewport) → top-right of first card's image
        const inX = interpolate(frame, [0, tapStart], [-40, 0], { extrapolateRight: "clamp" });
        const inY = interpolate(frame, [0, tapStart], [180, 0], { extrapolateRight: "clamp" });
        const fadeOut = interpolate(frame, [tapStart + 20, tapStart + 40], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const press = pressed ? 0.82 : 1;
        return (
          <div style={{
            position: "absolute",
            // First card copy button is roughly (grid left = center - 600, card 0..368, button at right - 12)
            // Positioning relative to center: card image col1 spans roughly x: center-600..center-232
            top: "calc(50% - 74px)",
            left: "calc(50% - 258px)",
            transform: `translate(${inX}px, ${inY}px) scale(${press})`,
            opacity: fadeOut,
            pointerEvents: "none",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: theme.ink, border: `3px solid ${theme.card}`,
              boxShadow: `0 6px 16px ${theme.ink}55`,
            }} />
          </div>
        );
      })()}

      {/* Side caption */}
      <div style={{
        position: "absolute", left: 110, top: 90, maxWidth: 300,
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.25em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 12,
          opacity: interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" }),
        }}>Step 01</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 44, lineHeight: 1.05,
          color: theme.ink, letterSpacing: "-0.02em",
          opacity: interpolate(frame, [18, 50], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Hover a work.<br/>Click <span style={{ fontStyle: "italic" }}>copy.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
