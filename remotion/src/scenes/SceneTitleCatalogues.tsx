import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

export const SceneTitleCatalogues: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });
  const subO = interpolate(frame, [22, 50], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [10, 60], [0, 1], { extrapolateRight: "clamp" });
  const platS = spring({ frame: frame - 14, fps, config: { damping: 24, stiffness: 70 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 80 }}>
      <div style={{ width: 720 }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.35em", textTransform: "uppercase",
          color: theme.muted, marginBottom: 28,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Tutorial 06 — Catalogues
        </div>

        <div style={{
          fontFamily: "DM Serif Display", fontSize: 132, lineHeight: 0.95, color: theme.ink,
          letterSpacing: "-0.03em",
          transform: `translateY(${(1 - titleS) * 30}px)`, opacity: titleS,
        }}>
          Build the<br/>publication<br/>record.
        </div>

        <div style={{ marginTop: 36, height: 1, background: theme.ink, transform: `scaleX(${lineW})`, transformOrigin: "left" }} />

        <div style={{
          fontFamily: "DM Sans", fontSize: 22, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5,
          maxWidth: 520, opacity: subO,
        }}>
          Catalogues, monographs, essays — the printed
          trace of every exhibition, linked to the works inside.
        </div>
      </div>

      <div style={{
        width: 320, height: 440, background: theme.card,
        boxShadow: "0 50px 100px -30px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)",
        transform: `translateY(${(1 - platS) * 40}px) rotate(${(1 - platS) * 6}deg)`, opacity: platS,
        overflow: "hidden", position: "relative",
      }}>
        <Img src={staticFile("images/catalogue-cover.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{
          position: "absolute", left: 18, right: 18, bottom: 14,
          fontFamily: "DM Sans", fontSize: 9, color: theme.muted, letterSpacing: "0.25em", textTransform: "uppercase",
          display: "flex", justifyContent: "space-between",
        }}>
          <span>GARF Archive</span><span>2026</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
