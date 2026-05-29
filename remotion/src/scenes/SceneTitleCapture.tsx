import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

export const SceneTitleCapture: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const kickerO = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const lineS = spring({ frame: frame - 14, fps, config: { damping: 22, stiffness: 90 } });
  const subO = interpolate(frame, [38, 64], [0, 1], { extrapolateRight: "clamp" });

  // Tilted phone preview drifts in
  const phoneS = spring({ frame: frame - 26, fps, config: { damping: 24, stiffness: 70 } });
  const drift = Math.sin(frame / 40) * 6;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 120, maxWidth: 1600 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "DM Sans", fontSize: 17, letterSpacing: "0.32em",
            textTransform: "uppercase", color: theme.muted, marginBottom: 28, opacity: kickerO,
          }}>Tutorial 04</div>

          <div style={{
            fontFamily: "DM Serif Display", fontSize: 132, lineHeight: 0.96,
            color: theme.ink, letterSpacing: "-0.03em",
            opacity: lineS, transform: `translateY(${(1 - lineS) * 30}px)`,
          }}>
            Capture,<br/>from the<br/><span style={{ fontStyle: "italic" }}>studio.</span>
          </div>

          <div style={{
            fontFamily: "DM Sans", fontSize: 22, color: theme.inkSoft, marginTop: 36,
            maxWidth: 520, lineHeight: 1.5, opacity: subO,
          }}>
            Photograph, log, and archive — directly from your phone or tablet.
          </div>
        </div>

        <div style={{
          width: 360, height: 740, borderRadius: 48,
          background: theme.ink, padding: 14,
          opacity: phoneS, transform: `translateY(${(1 - phoneS) * 60}px) rotate(${-3 + drift * 0.1}deg)`,
          boxShadow: "0 50px 80px -20px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.3)",
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: 36, overflow: "hidden",
            background: theme.bg, position: "relative",
          }}>
            <Img src={staticFile("images/art2.jpg")} style={{
              width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(180deg, ${theme.ink}10 0%, ${theme.ink}50 100%)`,
            }} />
            <div style={{
              position: "absolute", bottom: 28, left: 24, right: 24,
              fontFamily: "DM Serif Display", color: theme.card, fontSize: 22, lineHeight: 1.2,
            }}>
              Untitled (Vapor)
              <div style={{ fontFamily: "DM Sans", fontSize: 13, opacity: 0.8, marginTop: 6, letterSpacing: "0.08em" }}>
                CAPTURED · 2 SEC AGO
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
