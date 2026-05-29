import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const SceneTemplate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  // Cursor flies to "Download template" button
  const cursorO = interpolate(frame, [60, 78], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const cursorX = interpolate(frame, [60, 110], [1180, 1010], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const cursorY = interpolate(frame, [60, 110], [820, 680], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const btnPress = frame >= 112 && frame <= 120 ? 0.96 : 1;

  const ringO = interpolate(frame, [114, 138], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const ringS = interpolate(frame, [114, 138], [0.6, 1.6], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // After click — file token drops down out of the button
  const fileO = interpolate(frame, [124, 138, 175, 185], [0, 1, 1, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const fileY = interpolate(frame, [124, 175], [0, 110], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ width: 420, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 01</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Get the<br/>template.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          A pre-formatted Excel file with all the right columns.
        </div>
      </div>

      <div style={{
        width: 720, padding: "44px 52px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column", gap: 28,
        position: "relative",
      }}>
        <div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 30, color: theme.ink }}>Bulk import</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.muted, marginTop: 4 }}>
            Download the template for your role, fill it in, then upload.
          </div>
        </div>

        {/* template card preview */}
        <div style={{
          padding: 20, background: "#FBFAF7", border: `1px solid ${theme.ink}15`, borderRadius: 8,
          display: "flex", alignItems: "center", gap: 18,
        }}>
          <div style={{
            width: 54, height: 54, background: theme.ink, color: theme.bg, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.12em", fontWeight: 600,
          }}>XLSX</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "DM Sans", fontSize: 17, color: theme.ink, fontWeight: 500 }}>artist-template.xlsx</div>
            <div style={{ fontFamily: "DM Sans", fontSize: 13, color: theme.muted, marginTop: 2 }}>
              16 columns · Title, Category, Year, Medium, Dimensions, Image ID…
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "relative" }}>
            <div style={{
              padding: "14px 26px", background: theme.ink, color: theme.bg,
              fontFamily: "DM Sans", fontSize: 16, borderRadius: 4,
              display: "flex", alignItems: "center", gap: 10,
              transform: `scale(${btnPress})`,
            }}>↓ Download template</div>
            <div style={{
              position: "absolute", inset: -8, borderRadius: 10, border: `2px solid ${theme.ink}`,
              opacity: ringO, transform: `scale(${ringS})`, pointerEvents: "none",
            }} />

            {/* file falling out */}
            <div style={{
              position: "absolute", top: "100%", left: "50%", marginLeft: -90, marginTop: 8,
              transform: `translateY(${fileY}px)`,
              opacity: fileO,
              padding: "10px 14px", background: theme.card,
              border: `1px solid ${theme.ink}15`, borderRadius: 6,
              boxShadow: "0 14px 30px -8px rgba(0,0,0,0.18)",
              display: "flex", alignItems: "center", gap: 10, width: 180,
              fontFamily: "DM Sans", fontSize: 13, color: theme.ink,
            }}>
              <div style={{
                width: 30, height: 30, background: theme.ink, color: theme.bg, borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, letterSpacing: "0.1em",
              }}>XLSX</div>
              <span>artist-template.xlsx</span>
            </div>
          </div>
        </div>
      </div>

      <svg width="32" height="32" viewBox="0 0 24 24" style={{
        position: "absolute", left: cursorX, top: cursorY, opacity: cursorO,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
      }}>
        <path d="M3 2 L3 20 L8 15 L11 22 L14 21 L11 14 L18 14 Z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};
