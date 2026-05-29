import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { theme } from "../theme";

// Side-by-side: tablet (with grid catalogue) + phone (capture screen)
export const SceneAnyDevice: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tabletS = spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 70 } });
  const phoneS = spring({ frame: frame - 24, fps, config: { damping: 22, stiffness: 70 } });
  const drift = Math.sin(frame / 40) * 4;

  const captionO = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });

  const arts = ["images/art1.jpg", "images/art2.jpg", "images/art3.jpg", "images/art4.jpg", "images/art5.jpg", "images/art1.jpg"];

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      {/* Tablet */}
      <div style={{
        width: 760, height: 560, borderRadius: 28, background: theme.ink, padding: 16,
        opacity: tabletS, transform: `translateY(${(1 - tabletS) * 50}px) rotate(${-1 + drift * 0.05}deg)`,
        boxShadow: "0 60px 100px -25px rgba(0,0,0,0.35)",
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: 18, overflow: "hidden",
          background: theme.bg, display: "flex", flexDirection: "column",
        }}>
          <div style={{
            padding: "16px 22px", borderBottom: `1px solid ${theme.ink}12`,
            display: "flex", alignItems: "center", gap: 12, fontFamily: "DM Sans",
          }}>
            <div style={{ fontFamily: "DM Serif Display", fontSize: 18 }}>Artworks</div>
            <div style={{ fontSize: 11, color: theme.muted, marginLeft: "auto" }}>238 works</div>
          </div>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, flex: 1 }}>
            {arts.map((a, i) => {
              const o = interpolate(frame, [10 + i * 5, 30 + i * 5], [0, 1], { extrapolateRight: "clamp" });
              return (
                <div key={i} style={{
                  borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.ink}15`,
                  background: theme.card, opacity: o,
                }}>
                  <div style={{ aspectRatio: "1" }}>
                    <Img src={staticFile(a)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} />
                  </div>
                  <div style={{ padding: "8px 10px", fontFamily: "DM Sans" }}>
                    <div style={{ fontSize: 11, fontFamily: "DM Serif Display" }}>Untitled {i + 1}</div>
                    <div style={{ fontSize: 9, color: theme.muted, marginTop: 2 }}>2026 · Oil on linen</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Phone leaning in */}
      <div style={{
        width: 280, height: 580, borderRadius: 38, background: theme.ink, padding: 12,
        opacity: phoneS, transform: `translateY(${(1 - phoneS) * 60}px) rotate(${4 - drift * 0.08}deg)`,
        boxShadow: "0 50px 80px -25px rgba(0,0,0,0.35)",
        marginLeft: -80,
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: 28, overflow: "hidden",
          background: theme.bg, position: "relative", display: "flex", flexDirection: "column",
        }}>
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
            width: 80, height: 18, background: theme.ink, borderRadius: 10, zIndex: 50,
          }} />
          <div style={{ paddingTop: 40, padding: "40px 14px 10px", borderBottom: `1px solid ${theme.ink}12`, fontFamily: "DM Sans", fontSize: 13, fontWeight: 600 }}>
            Capture
          </div>
          <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ aspectRatio: "4/3", borderRadius: 10 }}>
              <Img src={staticFile("images/art2.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, filter: "grayscale(100%)" }} />
            </div>
            <div style={{ height: 28, borderRadius: 4, background: theme.card, border: `1px solid ${theme.ink}15` }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div style={{ height: 28, borderRadius: 4, background: theme.card, border: `1px solid ${theme.ink}15` }} />
              <div style={{ height: 28, borderRadius: 4, background: theme.card, border: `1px solid ${theme.ink}15` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Closing caption */}
      <div style={{
        position: "absolute", bottom: 130, left: 0, right: 0,
        textAlign: "center", opacity: captionO,
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.3em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 14,
        }}>Phone · Tablet · Desktop</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 64, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em",
        }}>
          Captured once. <span style={{ fontStyle: "italic" }}>archived forever.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
