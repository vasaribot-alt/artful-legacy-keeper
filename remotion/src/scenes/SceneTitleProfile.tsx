import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const SceneTitleProfile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const eyebrowO = interpolate(frame, [6, 28], [0, 1], { extrapolateRight: "clamp" });
  const eyebrowY = interpolate(frame, [6, 28], [16, 0], { extrapolateRight: "clamp" });
  const titleS = spring({ frame: frame - 16, fps, config: { damping: 22, stiffness: 110 } });
  const subO = interpolate(frame, [44, 72], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [30, 78], [0, 360], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{
        fontFamily: "DM Sans", fontSize: 18, letterSpacing: "0.4em", textTransform: "uppercase", color: theme.muted,
        opacity: eyebrowO, transform: `translateY(${eyebrowY}px)`,
      }}>Tutorial 02 — Your profile</div>

      <div style={{ height: 32 }} />

      <div style={{
        fontFamily: "DM Serif Display", fontSize: 156, lineHeight: 1, color: theme.ink, letterSpacing: "-0.025em",
        textAlign: "center", opacity: titleS, transform: `translateY(${(1 - titleS) * 30}px)`,
      }}>
        Build your<br/>profile.
      </div>

      <div style={{ height: 36, width: lineW, borderBottom: `1px solid ${theme.ink}`, marginTop: 36 }} />

      <div style={{
        fontFamily: "DM Sans", fontSize: 22, color: theme.inkSoft, marginTop: 28, opacity: subO,
        letterSpacing: "0.05em",
      }}>
        Bio, photo, galleries and CV — the essentials.
      </div>
    </AbsoluteFill>
  );
};
