import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";
import { PhoneFrame } from "../components/PhoneFrame";

const NAV = [
  { label: "Artist Registry", active: true, icon: "▦" },
  { label: "Collectors Register", icon: "▢" },
  { label: "Artist Profile", icon: "◷" },
  { label: "Artworks", icon: "◫" },
  { label: "Capture", icon: "◉", highlight: true },
  { label: "Series", icon: "◊" },
  { label: "Inventory", icon: "▤" },
  { label: "Portfolios", icon: "▥" },
  { label: "CV", icon: "≡" },
  { label: "Exhibitions", icon: "▦" },
  { label: "Catalogues", icon: "▣" },
  { label: "Provenance", icon: "◈" },
  { label: "Files", icon: "▱" },
];

export const SceneOpenSidebar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });

  // Sidebar slides in around frame 30
  const sideStart = 30;
  const sideS = spring({ frame: frame - sideStart, fps, config: { damping: 24, stiffness: 90 } });

  // Tap on Capture row around frame 110
  const tapStart = 110;
  const tapO = interpolate(frame, [tapStart, tapStart + 8, tapStart + 30], [0, 1, 0], { extrapolateRight: "clamp" });
  const tapScale = interpolate(frame, [tapStart, tapStart + 30], [0.4, 2], { extrapolateRight: "clamp" });
  const captureHover = frame > tapStart - 6;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <PhoneFrame opacity={phoneIn} translateY={(1 - phoneIn) * 40}>
        {/* Faux header bar (dimmed when sidebar opens) */}
        <div style={{
          paddingTop: 58, paddingLeft: 22, paddingRight: 22, paddingBottom: 14,
          borderBottom: `1px solid ${theme.ink}12`,
          display: "flex", alignItems: "center", gap: 12,
          fontFamily: "DM Sans",
          opacity: 1 - sideS * 0.6,
        }}>
          <div style={{ fontSize: 18, color: theme.ink, lineHeight: 1 }}>☰</div>
          <div style={{ flex: 1, fontFamily: "DM Serif Display", fontSize: 19, color: theme.ink }}>Catalogue Raisonné</div>
        </div>

        {/* Dimmed content peek */}
        <div style={{
          flex: 1, padding: 18, opacity: 1 - sideS * 0.85,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "center",
              padding: "10px 12px", borderRadius: 8, background: theme.card, border: `1px solid ${theme.ink}10`,
            }}>
              <div style={{ width: 40, height: 40, background: `${theme.ink}10`, borderRadius: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 8, background: `${theme.ink}15`, borderRadius: 2, width: "60%" }} />
                <div style={{ height: 6, background: `${theme.ink}10`, borderRadius: 2, width: "40%", marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar drawer */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0,
          width: "78%",
          background: theme.bg,
          borderRight: `1px solid ${theme.ink}15`,
          boxShadow: "8px 0 30px rgba(0,0,0,0.12)",
          transform: `translateX(${(1 - sideS) * -100}%)`,
          paddingTop: 50,
          display: "flex", flexDirection: "column",
        }}>
          {/* Top: Artist Registry pill */}
          <div style={{ padding: "12px 14px" }}>
            <div style={{
              background: theme.ink, color: theme.card, borderRadius: 8,
              padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
              fontFamily: "DM Sans", fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ fontSize: 14 }}>▦</span> Artist Registry
            </div>
            <div style={{
              marginTop: 6, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
              fontFamily: "DM Sans", fontSize: 13, color: theme.inkSoft,
            }}>
              <span style={{ fontSize: 14 }}>▢</span> Collectors Register
            </div>
          </div>

          <div style={{ height: 1, background: `${theme.ink}10`, margin: "8px 14px" }} />

          {/* Nav items */}
          <div style={{ flex: 1, padding: "4px 8px", overflow: "hidden" }}>
            {NAV.slice(2).map((n, i) => {
              const itemDelay = sideStart + 12 + i * 4;
              const itemO = interpolate(frame, [itemDelay, itemDelay + 14], [0, 1], { extrapolateRight: "clamp" });
              const itemX = interpolate(frame, [itemDelay, itemDelay + 18], [-12, 0], { extrapolateRight: "clamp" });
              const isCapture = n.label === "Capture";
              return (
                <div key={n.label} style={{
                  position: "relative",
                  padding: "9px 12px", display: "flex", alignItems: "center", gap: 12,
                  fontFamily: "DM Sans", fontSize: 13,
                  color: isCapture && captureHover ? theme.ink : theme.inkSoft,
                  fontWeight: isCapture && captureHover ? 600 : 400,
                  background: isCapture && captureHover ? `${theme.ink}08` : "transparent",
                  borderRadius: 6,
                  opacity: itemO, transform: `translateX(${itemX}px)`,
                }}>
                  <span style={{ fontSize: 13, opacity: 0.7 }}>{n.icon}</span>
                  {n.label}
                  {isCapture && (
                    <div style={{
                      position: "absolute", top: "50%", left: -2,
                      width: 60, height: 60, borderRadius: "50%",
                      border: `2px solid ${theme.ink}`,
                      transform: `translate(-50%, -50%) scale(${tapScale})`,
                      opacity: tapO * 0.5,
                      pointerEvents: "none",
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Sign out */}
          <div style={{
            padding: "14px 20px", borderTop: `1px solid ${theme.ink}10`,
            fontFamily: "DM Sans", fontSize: 13, color: theme.inkSoft,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span>↩</span> Sign Out
          </div>
        </div>
      </PhoneFrame>

      <div style={{
        position: "absolute", right: 140, top: "50%", transform: "translateY(-50%)",
        maxWidth: 340, textAlign: "right",
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.25em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 14,
          opacity: interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" }),
        }}>Step 01</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 56, lineHeight: 1.05,
          color: theme.ink, letterSpacing: "-0.02em",
          opacity: interpolate(frame, [16, 50], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Open the sidebar.<br/>Tap <span style={{ fontStyle: "italic" }}>Capture.</span>
        </div>
        <div style={{
          fontFamily: "DM Sans", fontSize: 17, color: theme.inkSoft, marginTop: 18, lineHeight: 1.5,
          opacity: interpolate(frame, [40, 76], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Available on every page — from any role.
        </div>
      </div>
    </AbsoluteFill>
  );
};
