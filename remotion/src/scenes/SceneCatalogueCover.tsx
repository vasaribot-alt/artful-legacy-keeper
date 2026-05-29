import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

export const SceneCatalogueCover: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const dropS = spring({ frame: frame - 8, fps, config: { damping: 22, stiffness: 110 } });

  // Upload phases: empty (0-60) → drag in (60-110) → reveal cover (110+)
  const dragX = interpolate(frame, [60, 110], [-280, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dragY = interpolate(frame, [60, 110], [-180, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dragScale = interpolate(frame, [60, 100, 110], [0.7, 0.6, 1], { extrapolateRight: "clamp" });
  const dragO = interpolate(frame, [60, 70, 105, 112], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const revealed = frame > 108;
  const revealS = spring({ frame: frame - 108, fps, config: { damping: 20, stiffness: 130 } });

  const checkO = interpolate(frame, [130, 150], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 90 }}>
      <div style={{ width: 420, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 02</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Cover<br/>image.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Upload the front cover. Stored at archival
          resolution, served everywhere it's referenced.
        </div>
        {checkO > 0 && (
          <div style={{
            marginTop: 30, fontFamily: "DM Sans", fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase",
            color: theme.ink, opacity: checkO, display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 11, background: theme.ink, color: theme.bg,
              display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12,
            }}>✓</span>
            Uploaded · ready
          </div>
        )}
      </div>

      <div style={{
        position: "relative",
        transform: `translateY(${(1 - dropS) * 40}px)`, opacity: dropS,
      }}>
        {/* Drop zone / cover */}
        <div style={{
          width: 320, height: 440, background: revealed ? "transparent" : theme.card,
          border: revealed ? "none" : `2px dashed ${theme.ink}40`,
          borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
          boxShadow: revealed ? "0 40px 80px -20px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.08)" : "none",
        }}>
          {!revealed && (
            <div style={{ textAlign: "center", color: theme.muted, fontFamily: "DM Sans" }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>+</div>
              <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>Add cover</div>
            </div>
          )}
          {revealed && (
            <div style={{
              position: "absolute", inset: 0,
              opacity: revealS,
              clipPath: `inset(${(1 - revealS) * 100}% 0 0 0)`,
            }}>
              <Img src={staticFile("images/catalogue-cover.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>

        {/* Flying file */}
        {dragO > 0 && (
          <div style={{
            position: "absolute", left: 50, top: 80,
            transform: `translate(${dragX}px, ${dragY}px) scale(${dragScale}) rotate(${dragX * 0.05}deg)`,
            opacity: dragO,
            width: 180, height: 240,
            background: theme.card,
            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}>
            <Img src={staticFile("images/catalogue-cover.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
