import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const RAW_CV = `2024  Solo exhibition, Kunsthalle Bergen
2023  Group show — Atlas, Tate Modern, London
2022  Residency, Cité Internationale des Arts, Paris
2021  MFA Fine Art, Royal College of Art, London`;

const PARSED = [
  { year: "2024", type: "Solo", title: "Kunsthalle Bergen", city: "Bergen, NO" },
  { year: "2023", type: "Group", title: "Atlas — Tate Modern", city: "London, UK" },
  { year: "2022", type: "Residency", title: "Cité Internationale des Arts", city: "Paris, FR" },
  { year: "2021", type: "Education", title: "MFA Fine Art, Royal College of Art", city: "London, UK" },
];

export const SceneCV: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  // Phase 1 (0–140): textarea with pasted CV appears
  const pasteFlash = interpolate(frame, [30, 36, 44], [0, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const textO = interpolate(frame, [38, 56], [0, 1], { extrapolateRight: "clamp" });

  // Cursor flies to "Parse with AI" button
  const cursorO = interpolate(frame, [90, 108], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const cursorX = interpolate(frame, [90, 138], [1250, 1090], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const cursorY = interpolate(frame, [90, 138], [860, 720], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const btnPress = frame >= 138 && frame <= 146 ? 0.96 : 1;
  const ringO = interpolate(frame, [140, 164], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const ringS = interpolate(frame, [140, 164], [0.6, 1.6], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Phase 2 (160+): textarea fades, parsed rows fade-in staggered
  const rawO = interpolate(frame, [148, 172], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const parsedHeaderO = interpolate(frame, [172, 190], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 400, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 04</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Paste<br/>your CV.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          AI structures it into exhibitions, residencies and education.
        </div>
      </div>

      <div style={{
        width: 820, padding: "52px 56px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column", gap: 22,
        position: "relative", minHeight: 540,
      }}>
        <div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 30, color: theme.ink }}>Import CV</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.muted, marginTop: 4 }}>Paste any text — AI will structure it.</div>
        </div>

        {/* textarea (raw paste) */}
        <div style={{
          position: "relative", border: `1.5px solid ${theme.ink}25`, borderRadius: 6,
          padding: 22, minHeight: 220, background: "#FBFAF7",
          opacity: rawO,
        }}>
          {/* paste flash */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 6, border: `2px solid ${theme.ink}`,
            opacity: pasteFlash, pointerEvents: "none",
          }} />
          <pre style={{
            margin: 0, fontFamily: "DM Sans", fontSize: 17, lineHeight: 1.7, color: theme.ink,
            opacity: textO, whiteSpace: "pre-wrap",
          }}>{RAW_CV}</pre>
        </div>

        {/* parse button + ⌘V indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: rawO }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, color: theme.muted, letterSpacing: "0.1em" }}>
            <span style={{ padding: "3px 8px", border: `1px solid ${theme.ink}30`, borderRadius: 3, marginRight: 6 }}>⌘ V</span>
            Pasted from clipboard
          </div>
          <div style={{ position: "relative" }}>
            <div style={{
              padding: "14px 28px", background: theme.ink, color: theme.bg,
              fontFamily: "DM Sans", fontSize: 16, borderRadius: 4,
              transform: `scale(${btnPress})`,
            }}>✨ Parse with AI</div>
            <div style={{
              position: "absolute", inset: -8, borderRadius: 10, border: `2px solid ${theme.ink}`,
              opacity: ringO, transform: `scale(${ringS})`, pointerEvents: "none",
            }} />
          </div>
        </div>

        {/* parsed result */}
        <div style={{
          position: "absolute", left: 56, right: 56, top: 130, bottom: 52,
          opacity: parsedHeaderO,
        }}>
          <div style={{ display: "flex", gap: 24, padding: "0 12px 10px", borderBottom: `1px solid ${theme.ink}15`,
            fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.muted }}>
            <div style={{ width: 60 }}>Year</div>
            <div style={{ width: 110 }}>Type</div>
            <div style={{ flex: 1 }}>Title / Venue</div>
            <div style={{ width: 140 }}>Location</div>
          </div>
          {PARSED.map((row, i) => {
            const delay = 188 + i * 14;
            const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130 } });
            return (
              <div key={row.year + row.title} style={{
                display: "flex", gap: 24, padding: "16px 12px", alignItems: "center",
                borderBottom: `1px solid ${theme.ink}10`,
                fontFamily: "DM Sans", fontSize: 16, color: theme.ink,
                opacity: s, transform: `translateY(${(1 - s) * 10}px)`,
              }}>
                <div style={{ width: 60, fontFamily: "DM Serif Display", fontSize: 20 }}>{row.year}</div>
                <div style={{ width: 110 }}>
                  <span style={{
                    padding: "3px 8px", border: `1px solid ${theme.ink}30`,
                    borderRadius: 3, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
                  }}>{row.type}</span>
                </div>
                <div style={{ flex: 1 }}>{row.title}</div>
                <div style={{ width: 140, color: theme.inkSoft, fontSize: 14 }}>{row.city}</div>
              </div>
            );
          })}
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
