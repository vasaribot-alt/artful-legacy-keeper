import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

// Stylized portrait via SVG — abstract, gender-neutral silhouette
const PortraitSVG: React.FC<{ opacity: number }> = ({ opacity }) => (
  <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ opacity, display: "block" }}>
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E8E4DD" />
        <stop offset="100%" stopColor="#C7C2BA" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#grad)" />
    <circle cx="100" cy="78" r="34" fill="#0D0D0D" opacity="0.85" />
    <path d="M40 200 Q40 130 100 130 Q160 130 160 200 Z" fill="#0D0D0D" opacity="0.85" />
  </svg>
);

export const SceneProfilePhoto: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const dropS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  // File floats in from top-right, lands in the drop zone around frame 80
  const fileO = interpolate(frame, [40, 60, 78, 86], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const fileX = interpolate(frame, [40, 82], [380, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const fileY = interpolate(frame, [40, 82], [-220, -20], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const fileRot = interpolate(frame, [40, 82], [-8, 0]);

  const dropHighlight = frame >= 60 && frame < 86 ? 1 : 0;
  const portraitO = interpolate(frame, [84, 120], [0, 1], { extrapolateRight: "clamp" });
  const dashedO = interpolate(frame, [84, 110], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ width: 420, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 02</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          A portrait.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Drag a photo into the frame. Square crops best.
        </div>
      </div>

      {/* drop card */}
      <div style={{
        width: 560, padding: 48, background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - dropS) * 60}px)`, opacity: dropS,
        position: "relative",
      }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.muted, marginBottom: 16 }}>Profile photo</div>

        <div style={{
          position: "relative", width: "100%", aspectRatio: "1 / 1",
          background: dropHighlight ? "#F5F1EA" : "#FAF8F4",
          border: `2px dashed ${dropHighlight ? theme.ink : theme.ink + "40"}`,
          borderRadius: 8, overflow: "hidden",
          transition: "none",
        }}>
          {/* dashed-state caption */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
            opacity: dashedO, color: theme.muted, fontFamily: "DM Sans",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28, border: `1.5px solid ${theme.ink}40`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: theme.ink,
            }}>↑</div>
            <div style={{ fontSize: 17 }}>Drop image here</div>
            <div style={{ fontSize: 13, color: theme.muted }}>JPG or PNG · up to 20 MB</div>
          </div>

          {/* portrait reveal */}
          <div style={{ position: "absolute", inset: 0, opacity: portraitO }}>
            <PortraitSVG opacity={1} />
          </div>
        </div>
      </div>

      {/* floating file token */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: `translate(${fileX}px, ${fileY}px) rotate(${fileRot}deg)`,
        opacity: fileO,
        background: theme.card, padding: "12px 16px", borderRadius: 8,
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", gap: 12,
        fontFamily: "DM Sans", fontSize: 15, color: theme.ink,
      }}>
        <div style={{ width: 36, height: 36, background: theme.ink, color: theme.bg, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, letterSpacing: "0.1em" }}>JPG</div>
        <div>
          <div style={{ fontWeight: 500 }}>portrait_2024.jpg</div>
          <div style={{ fontSize: 12, color: theme.muted }}>2.4 MB</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
