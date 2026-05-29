import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const SceneVeriff: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  // scan line
  const scanY = interpolate(frame, [30, 90], [0, 420], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // checkmark draw
  const checkP = interpolate(frame, [90, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // approved chip appears
  const approvedS = spring({ frame: frame - 95, fps, config: { damping: 18, stiffness: 110 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 100 }}>
      {/* left card: passport mock */}
      <div style={{
        width: 640, height: 440, background: "#1c1c1c", borderRadius: 14, position: "relative", overflow: "hidden",
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.45)",
        transform: `translateY(${(1 - cardS) * 60}px) rotate(${-3 + cardS * 1}deg)`, opacity: cardS,
      }}>
        <div style={{ position: "absolute", inset: 28, border: "1px solid #ffffff20", borderRadius: 8, padding: 24, color: "#E8E4DC", fontFamily: "DM Sans" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.5 }}>Passport · Kingdom of Norway</div>
          <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
            <div style={{ width: 120, height: 150, background: "#2a2a2a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>👤</div>
            <div style={{ flex: 1, fontSize: 14, lineHeight: 1.9 }}>
              <div style={{ opacity: 0.5, fontSize: 10, letterSpacing: "0.2em" }}>SURNAME / GIVEN NAMES</div>
              <div style={{ fontSize: 18, marginBottom: 12 }}>VÆRSLEV, FREDRIK</div>
              <div style={{ opacity: 0.5, fontSize: 10, letterSpacing: "0.2em" }}>DATE OF BIRTH</div>
              <div style={{ fontSize: 16, marginBottom: 12 }}>1979-08-12</div>
              <div style={{ opacity: 0.5, fontSize: 10, letterSpacing: "0.2em" }}>NATIONALITY</div>
              <div style={{ fontSize: 16 }}>NORWEGIAN</div>
            </div>
          </div>
          <div style={{ position: "absolute", left: 24, right: 24, bottom: 24, fontSize: 14, fontFamily: "monospace", opacity: 0.55, letterSpacing: "0.18em" }}>
            P&lt;NORVAERSLEV&lt;&lt;FREDRIK&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
          </div>
          {/* scan line */}
          {frame >= 30 && frame <= 92 && (
            <div style={{ position: "absolute", left: 0, right: 0, top: scanY, height: 2, background: "linear-gradient(90deg, transparent, #fff, transparent)", opacity: 0.85, boxShadow: "0 0 18px rgba(255,255,255,0.6)" }} />
          )}
        </div>
      </div>

      {/* right: verification panel */}
      <div style={{ width: 520, display: "flex", flexDirection: "column", gap: 28, opacity: cardS, transform: `translateX(${(1 - cardS) * 30}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted }}>Step 03 · Optional</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 80, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Verify<br/>your identity.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 20, color: theme.inkSoft, lineHeight: 1.5 }}>
          A one-time ID check unlocks the verified artist badge on your public profile.
        </div>

        {/* approved chip */}
        <div style={{
          marginTop: 10, display: "inline-flex", alignItems: "center", gap: 14,
          padding: "16px 22px", borderRadius: 999, background: theme.ink, color: theme.bg, alignSelf: "flex-start",
          fontFamily: "DM Sans", fontSize: 18, letterSpacing: "0.08em",
          transform: `scale(${approvedS})`, opacity: approvedS,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5 L10 17.5 L19 7"
              stroke={theme.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="30" strokeDashoffset={(1 - checkP) * 30} />
          </svg>
          Identity verified
        </div>
      </div>
    </AbsoluteFill>
  );
};
