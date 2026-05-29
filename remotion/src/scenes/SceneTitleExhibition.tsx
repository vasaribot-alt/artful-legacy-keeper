import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

export const SceneTitleExhibition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const kickerO = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const lineS = spring({ frame: frame - 14, fps, config: { damping: 22, stiffness: 90 } });
  const subO = interpolate(frame, [42, 70], [0, 1], { extrapolateRight: "clamp" });

  const plateS = spring({ frame: frame - 30, fps, config: { damping: 26, stiffness: 70 } });
  const drift = Math.sin(frame / 50) * 4;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 110, maxWidth: 1620 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "DM Sans", fontSize: 17, letterSpacing: "0.32em",
            textTransform: "uppercase", color: theme.muted, marginBottom: 28, opacity: kickerO,
          }}>Tutorial 05</div>

          <div style={{
            fontFamily: "DM Serif Display", fontSize: 132, lineHeight: 0.96,
            color: theme.ink, letterSpacing: "-0.03em",
            opacity: lineS, transform: `translateY(${(1 - lineS) * 30}px)`,
          }}>
            Document<br/>the <span style={{ fontStyle: "italic" }}>exhibition.</span>
          </div>

          <div style={{
            fontFamily: "DM Sans", fontSize: 22, color: theme.inkSoft, marginTop: 36,
            maxWidth: 560, lineHeight: 1.5, opacity: subO,
          }}>
            Venue, dates, installation views, press text — preserved for the archive and synced to your CV.
          </div>
        </div>

        {/* Installation view plate with caption */}
        <div style={{
          width: 560, opacity: plateS, transform: `translateY(${(1 - plateS) * 40}px) translateY(${drift}px)`,
        }}>
          <div style={{
            position: "relative", aspectRatio: "4/3", background: theme.ink, overflow: "hidden",
            boxShadow: "0 50px 100px -30px rgba(0,0,0,0.35)",
          }}>
            <Img src={staticFile("images/install5.jpg")} style={{
              width: "100%", height: "100%", objectFit: "cover",
            }} />
          </div>
          <div style={{
            marginTop: 18, fontFamily: "DM Sans", fontSize: 13, color: theme.muted,
            letterSpacing: "0.16em", textTransform: "uppercase",
          }}>
            Installation view · Vapor IV, 2026
          </div>
          <div style={{
            marginTop: 4, fontFamily: "DM Sans", fontSize: 13, color: theme.muted, fontStyle: "italic",
          }}>
            Photo: M. Reinholdt — Kunsthalle Köln
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
