import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { theme } from "../theme";
import { PhoneFrame, PhoneHeader } from "../components/PhoneFrame";

export const SceneTakePhoto: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });

  // Tap ripple at ~frame 35
  const tapStart = 35;
  const tapO = interpolate(frame, [tapStart, tapStart + 8, tapStart + 30], [0, 1, 0], { extrapolateRight: "clamp" });
  const tapScale = interpolate(frame, [tapStart, tapStart + 30], [0.4, 2.2], { extrapolateRight: "clamp" });

  // Camera button press
  const pressed = frame > tapStart && frame < tapStart + 14;

  // Photos appear staggered after tap
  const photos = [
    { src: "images/art1.jpg", at: 70 },
    { src: "images/art3.jpg", at: 95 },
    { src: "images/art4.jpg", at: 120 },
  ];

  // Show form preview sliding up at end
  const showForm = frame > 150;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <PhoneFrame opacity={phoneIn} translateY={(1 - phoneIn) * 40}>
        <PhoneHeader title="Capture" />

        <div style={{ padding: 18, flex: 1, overflow: "hidden" }}>
          {/* Capture area */}
          {photos.filter(p => frame >= p.at).length === 0 ? (
            <div style={{
              width: "100%", aspectRatio: "4/3",
              borderRadius: 12, border: `2px dashed ${theme.ink}25`,
              background: `${theme.ink}05`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 10, color: theme.muted, fontFamily: "DM Sans",
              position: "relative", overflow: "hidden",
              transform: pressed ? "scale(0.985)" : "scale(1)",
            }}>
              {/* Camera icon */}
              <div style={{
                width: 50, height: 38, border: `2px solid ${theme.muted}`, borderRadius: 8, position: "relative",
              }}>
                <div style={{
                  position: "absolute", top: -8, left: 12, width: 18, height: 10,
                  border: `2px solid ${theme.muted}`, borderBottom: "none",
                  borderRadius: "4px 4px 0 0",
                }} />
                <div style={{
                  position: "absolute", top: 6, left: 12, width: 22, height: 22,
                  border: `2px solid ${theme.muted}`, borderRadius: "50%",
                }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.ink }}>Take photo</div>
              <div style={{ fontSize: 11 }}>Tap to open camera</div>

              {/* Tap ripple */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: 140, height: 140, borderRadius: "50%",
                border: `2px solid ${theme.ink}`,
                transform: `translate(-50%, -50%) scale(${tapScale})`,
                opacity: tapO * 0.4,
              }} />

              {/* Finger tap cursor moves in and taps */}
              {(() => {
                const inX = interpolate(frame, [0, tapStart], [130, 0], { extrapolateRight: "clamp" });
                const inY = interpolate(frame, [0, tapStart], [170, 0], { extrapolateRight: "clamp" });
                const fadeOut = interpolate(frame, [tapStart + 16, tapStart + 30], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const press = pressed ? 0.78 : 1;
                return (
                  <div style={{
                    position: "absolute", top: "calc(50% + 6px)", left: "calc(50% + 10px)",
                    transform: `translate(${inX}px, ${inY}px) scale(${press})`,
                    opacity: fadeOut,
                    pointerEvents: "none",
                  }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: "50%",
                      background: theme.ink, border: `3px solid ${theme.card}`,
                      boxShadow: `0 8px 20px ${theme.ink}55`,
                    }} />
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6,
            }}>
              {photos.map((p) => {
                const o = interpolate(frame, [p.at, p.at + 14], [0, 1], { extrapolateRight: "clamp" });
                const s = spring({ frame: frame - p.at, fps, config: { damping: 18 } });
                return (
                  <div key={p.src} style={{
                    aspectRatio: "1", borderRadius: 8, overflow: "hidden",
                    border: `1px solid ${theme.ink}15`,
                    opacity: o, transform: `scale(${0.85 + s * 0.15})`,
                  }}>
                    <Img src={staticFile(p.src)} style={{
                      width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)",
                    }} />
                  </div>
                );
              })}
              {/* Add more tile */}
              <div style={{
                aspectRatio: "1", borderRadius: 8, border: `2px dashed ${theme.ink}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: theme.muted, fontFamily: "DM Sans", fontSize: 10,
                opacity: frame > 130 ? 1 : 0,
              }}>+ ADD</div>
            </div>
          )}

          {/* Form skeleton preview sliding up */}
          {showForm && (() => {
            const fS = spring({ frame: frame - 150, fps, config: { damping: 22 } });
            return (
              <div style={{
                marginTop: 18,
                opacity: fS, transform: `translateY(${(1 - fS) * 30}px)`,
                display: "flex", flexDirection: "column", gap: 12,
                fontFamily: "DM Sans",
              }}>
                <div>
                  <div style={{ fontSize: 10, color: theme.muted, marginBottom: 4 }}>TITLE *</div>
                  <div style={{ height: 38, borderRadius: 6, background: theme.card, border: `1px solid ${theme.ink}15` }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: theme.muted, marginBottom: 4 }}>DATE</div>
                    <div style={{ height: 38, borderRadius: 6, background: theme.card, border: `1px solid ${theme.ink}15` }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: theme.muted, marginBottom: 4 }}>SERIES</div>
                    <div style={{ height: 38, borderRadius: 6, background: theme.card, border: `1px solid ${theme.ink}15` }} />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </PhoneFrame>

      {/* Side caption */}
      <div style={{
        position: "absolute", left: 140, top: "50%", transform: "translateY(-50%)",
        maxWidth: 340,
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.25em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 14,
          opacity: interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" }),
        }}>Step 02</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 56, lineHeight: 1.05,
          color: theme.ink, letterSpacing: "-0.02em",
          opacity: interpolate(frame, [16, 50], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Tap <span style={{ fontStyle: "italic" }}>Take photo.</span>
        </div>
        <div style={{
          fontFamily: "DM Sans", fontSize: 17, color: theme.inkSoft, marginTop: 18, lineHeight: 1.5,
          opacity: interpolate(frame, [40, 76], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          One tap. Native camera. Multiple angles per work.
        </div>
      </div>
    </AbsoluteFill>
  );
};
