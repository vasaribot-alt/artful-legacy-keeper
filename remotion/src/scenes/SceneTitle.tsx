import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const eyebrow = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const eyebrowY = interpolate(frame, [0, 18], [12, 0], { extrapolateRight: "clamp" });
  const titleScale = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 90 } });
  const titleY = interpolate(titleScale, [0, 1], [40, 0]);
  const lineW = interpolate(frame, [22, 60], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [40, 60], [16, 0], { extrapolateRight: "clamp" });
  const subO = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 180 }}>
      <div style={{ maxWidth: 1400 }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 22, letterSpacing: "0.35em", textTransform: "uppercase",
          color: theme.muted, opacity: eyebrow, transform: `translateY(${eyebrowY}px)`, marginBottom: 36,
        }}>Chapter 01 — Begin</div>
        <h1 style={{
          fontFamily: "DM Serif Display", fontSize: 200, lineHeight: 0.95, color: theme.ink, margin: 0,
          letterSpacing: "-0.02em",
          transform: `translateY(${titleY}px) scale(${0.92 + titleScale * 0.08})`,
          transformOrigin: "left center",
        }}>
          How to<br/>register.
        </h1>
        <div style={{
          width: `${lineW * 420}px`, height: 2, background: theme.ink, marginTop: 48, marginBottom: 32,
        }} />
        <p style={{
          fontFamily: "DM Sans", fontSize: 28, color: theme.inkSoft, margin: 0,
          opacity: subO, transform: `translateY(${subY}px)`, maxWidth: 800, lineHeight: 1.45,
        }}>
          Three minutes to create your free archival vault for the next hundred years.
        </p>
      </div>
    </AbsoluteFill>
  );
};
