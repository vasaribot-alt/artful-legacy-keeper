import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

// Mock browser visiting the landing page, then mouse moves to Register
export const SceneVisit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const windowIn = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });
  const urlType = Math.min(1, Math.max(0, (frame - 18) / 30));
  const url = "globalartistregistry.org".slice(0, Math.floor(urlType * 24));
  const cursorX = interpolate(frame, [55, 95], [600, 1380], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const cursorY = interpolate(frame, [55, 95], [520, 380], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const btnPress = frame >= 92 && frame <= 100 ? 0.95 : 1;
  const ringO = interpolate(frame, [92, 110], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const ringS = interpolate(frame, [92, 110], [0.4, 1.5], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 1500, height: 820, background: theme.card, borderRadius: 18,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
        transform: `translateY(${(1 - windowIn) * 80}px) scale(${0.96 + windowIn * 0.04})`,
        opacity: windowIn, overflow: "hidden", position: "relative",
      }}>
        {/* browser chrome */}
        <div style={{ height: 56, background: "#F6F4EF", borderBottom: "1px solid #00000010", display: "flex", alignItems: "center", paddingLeft: 24, gap: 8 }}>
          {["#FF5F57","#FEBC2E","#28C840"].map(c => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
          <div style={{ marginLeft: 32, flex: 1, height: 32, borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", paddingLeft: 16, fontFamily: "DM Sans", fontSize: 15, color: theme.inkSoft }}>
            {url}<span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>|</span>
          </div>
        </div>
        {/* page body */}
        <div style={{ padding: 80, display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 14, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted }}>
            Global Artist Registry Foundation
          </div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 96, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em", maxWidth: 1100 }}>
            A 100-year archive for living artists.
          </div>
          <div style={{ fontFamily: "DM Sans", fontSize: 22, color: theme.inkSoft, maxWidth: 900, lineHeight: 1.5 }}>
            Document, verify and preserve your life's work in a permanent, neutral registry.
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            <div style={{ position: "relative" }}>
              <div style={{
                padding: "20px 44px", background: theme.ink, color: theme.bg, fontFamily: "DM Sans", fontWeight: 500,
                fontSize: 20, borderRadius: 4, transform: `scale(${btnPress})`,
              }}>Register</div>
              {/* click ripple */}
              <div style={{
                position: "absolute", inset: -10, borderRadius: 12, border: `2px solid ${theme.ink}`,
                opacity: ringO, transform: `scale(${ringS})`,
              }} />
            </div>
            <div style={{
              padding: "20px 44px", border: `1px solid ${theme.ink}30`, color: theme.ink, fontFamily: "DM Sans",
              fontSize: 20, borderRadius: 4,
            }}>Sign in</div>
          </div>
        </div>
        {/* cursor */}
        <svg width="32" height="32" viewBox="0 0 24 24" style={{ position: "absolute", left: cursorX, top: cursorY, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}>
          <path d="M3 2 L3 20 L8 15 L11 22 L14 21 L11 14 L18 14 Z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
