import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const RESULTS = [
  { name: "Galerie Nordlys", city: "Copenhagen, DK" },
  { name: "Galerie Pierre Marin", city: "Paris, FR" },
  { name: "Galleria Continua", city: "San Gimignano, IT" },
];

export const SceneGalleries: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  const typeQ = "Galerie Nord";
  const tQ = Math.min(1, Math.max(0, (frame - 30) / 60));
  const queryShown = typeQ.slice(0, Math.floor(tQ * typeQ.length));

  const dropdownO = interpolate(frame, [86, 104], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Cursor flies to first result and "clicks" around frame 138
  const cursorO = interpolate(frame, [100, 118], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const cursorX = interpolate(frame, [100, 138], [1240, 1020], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const cursorY = interpolate(frame, [100, 138], [880, 600], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const ringO = interpolate(frame, [138, 162], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const ringS = interpolate(frame, [138, 162], [0.6, 1.5], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // After click: dropdown closes, chip appears
  const afterClick = frame >= 142;
  const dropdownO2 = afterClick ? 0 : dropdownO;
  const chipS = spring({ frame: frame - 148, fps, config: { damping: 22, stiffness: 130 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ width: 420, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 03</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Your<br/>galleries.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Search 7,000+ verified galleries and add who represents you.
        </div>
      </div>

      <div style={{
        width: 720, padding: "52px 60px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column", gap: 26,
        position: "relative",
      }}>
        <div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 32, color: theme.ink }}>Representing galleries</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 15, color: theme.muted, marginTop: 4 }}>Linked to your public artist page.</div>
        </div>

        {/* search field */}
        <div style={{ position: "relative" }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.muted, marginBottom: 10 }}>Search</div>
          <div style={{
            height: 52, borderBottom: `1.5px solid ${theme.ink}`, display: "flex", alignItems: "center",
            fontFamily: "DM Sans", fontSize: 22, color: theme.ink, gap: 12,
          }}>
            <span style={{ color: theme.muted, fontSize: 20 }}>⌕</span>
            <span>{queryShown}<span style={{ opacity: frame % 30 < 15 && tQ < 1 ? 1 : 0, marginLeft: 2 }}>|</span></span>
          </div>

          {/* autocomplete dropdown */}
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: 8,
            background: theme.card, border: `1px solid ${theme.ink}15`, borderRadius: 6,
            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.18)",
            opacity: dropdownO2, transform: `translateY(${(1 - dropdownO2) * -8}px)`,
            overflow: "hidden",
          }}>
            {RESULTS.map((r, i) => (
              <div key={r.name} style={{
                padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
                background: i === 0 && frame >= 124 && frame < 144 ? "#F3EFE8" : "transparent",
                borderTop: i === 0 ? "none" : `1px solid ${theme.ink}10`,
                fontFamily: "DM Sans",
                position: "relative",
              }}>
                <div>
                  <div style={{ fontSize: 17, color: theme.ink }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: theme.muted, marginTop: 2 }}>{r.city}</div>
                </div>
                <div style={{ fontSize: 12, color: theme.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Verified</div>
                {/* click ripple on first row */}
                {i === 0 && (
                  <div style={{
                    position: "absolute", inset: 6, borderRadius: 6, border: `2px solid ${theme.ink}`,
                    opacity: ringO, transform: `scale(${ringS})`, pointerEvents: "none",
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* selected chips */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.muted, marginBottom: 12 }}>Selected</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            padding: "12px 18px", background: theme.ink, color: theme.bg, borderRadius: 4,
            fontFamily: "DM Sans", fontSize: 16,
            opacity: chipS, transform: `scale(${0.9 + chipS * 0.1})`,
          }}>
            <span>Galerie Nordlys · Copenhagen</span>
            <span style={{ opacity: 0.6 }}>×</span>
          </div>
        </div>
      </div>

      {/* cursor */}
      <svg width="32" height="32" viewBox="0 0 24 24" style={{
        position: "absolute", left: cursorX, top: cursorY, opacity: cursorO,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
      }}>
        <path d="M3 2 L3 20 L8 15 L11 22 L14 21 L11 14 L18 14 Z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};
