import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

export const SceneCatalogueLink: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 110 } });

  // Picker opens at 70, picks Vapor at 130, closes 175
  const pickerOpen = frame > 70 && frame < 175;
  const pickerS = spring({ frame: frame - 70, fps, config: { damping: 22, stiffness: 160 } });
  const pickerC = interpolate(frame, [170, 178], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pickerVis = pickerOpen ? pickerS : pickerC;

  const checked = frame > 128;
  const checkPulse = interpolate(frame, [128, 140, 158], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const badgeS = spring({ frame: frame - 178, fps, config: { damping: 22, stiffness: 140 } });
  const badgeVis = frame > 178;

  const pageS = spring({ frame: frame - 200, fps, config: { damping: 22, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 360, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 04</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Link to<br/>artworks.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Attach a catalogue to a work and record
          the page it appears on.
        </div>
      </div>

      <div style={{ position: "relative", width: 900 }}>
        {/* Artwork card */}
        <div style={{
          padding: "36px 40px", background: theme.card, borderRadius: 12,
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
          transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
          display: "flex", gap: 30,
        }}>
          <div style={{ width: 220, height: 280, background: "#1a1a1a", overflow: "hidden", flexShrink: 0 }}>
            <Img src={staticFile("images/install1.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "DM Sans", fontSize: 11, color: theme.muted, letterSpacing: "0.18em", textTransform: "uppercase" }}>GAWID-00100123</div>
            <div style={{ fontFamily: "DM Serif Display", fontSize: 32, color: theme.ink, marginTop: 6, lineHeight: 1.1 }}>
              Untitled (Vapor I)
            </div>
            <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.inkSoft, marginTop: 6 }}>
              Oil on linen · 180 × 140 cm · 2024
            </div>

            {/* Catalogues label */}
            <div style={{ marginTop: 28, fontSize: 11, color: theme.muted, letterSpacing: "0.18em" }}>CATALOGUES</div>

            {/* Selected badge */}
            <div style={{ minHeight: 38, marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {badgeVis && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "6px 12px 6px 14px", background: theme.bg, border: `1px solid ${theme.ink}20`,
                  borderRadius: 4, fontFamily: "DM Sans", fontSize: 13, color: theme.ink,
                  transform: `scale(${0.6 + 0.4 * badgeS})`, opacity: badgeS, transformOrigin: "left center",
                }}>
                  <span>Vapor (2026)</span>
                  <span style={{ color: theme.muted }}>·</span>
                  <span style={{ color: theme.muted, fontSize: 12 }}>p. 47</span>
                  <span style={{
                    marginLeft: 4, width: 16, height: 16, borderRadius: 8, background: `${theme.ink}10`,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: theme.muted,
                  }}>×</span>
                </div>
              )}
            </div>

            {/* Picker trigger */}
            <div style={{
              marginTop: 4, width: "100%", height: 38, border: `1px solid ${theme.ink}25`, borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px",
              fontFamily: "DM Sans", fontSize: 13, color: theme.inkSoft, background: theme.card,
            }}>
              <span>Select from catalogues ({badgeVis ? 1 : 0} selected)</span>
              <span style={{ color: theme.muted }}>⌄</span>
            </div>

            {/* Page reference shown after badge */}
            {pageS > 0 && (
              <div style={{ marginTop: 18, opacity: pageS, transform: `translateY(${(1 - pageS) * 6}px)` }}>
                <div style={{ fontSize: 11, color: theme.muted, letterSpacing: "0.18em" }}>PAGE REFERENCE</div>
                <div style={{
                  marginTop: 6, width: 120, height: 38, border: `1.5px solid ${theme.ink}`,
                  display: "flex", alignItems: "center", padding: "0 12px",
                  fontFamily: "DM Sans", fontSize: 16, color: theme.ink,
                }}>
                  47
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Popover */}
        {pickerVis > 0.01 && (
          <div style={{
            position: "absolute", right: 40, top: 268, width: 360,
            background: theme.card, borderRadius: 8,
            boxShadow: "0 30px 60px -15px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)",
            transform: `scale(${0.92 + 0.08 * pickerVis}) translateY(${(1 - pickerVis) * -8}px)`,
            transformOrigin: "top right", opacity: pickerVis, padding: 8,
          }}>
            {[
              { t: "Vapor",                              y: 2026, hit: true },
              { t: "With an Essay by Hanne De Wachter",  y: 2024, hit: false },
              { t: "Marie Lefèvre / Elin Vandermeer",    y: 2022, hit: false },
            ].map((row) => (
              <div key={row.t} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                background: row.hit && frame > 120 && frame < 160 ? `${theme.ink}08` : "transparent",
                borderRadius: 4,
              }}>
                <div style={{
                  width: 16, height: 16, border: `1.5px solid ${theme.ink}`, borderRadius: 3,
                  background: row.hit && checked ? theme.ink : "transparent",
                  position: "relative", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: theme.bg, fontSize: 11,
                }}>
                  {row.hit && checked && "✓"}
                  {row.hit && checkPulse > 0 && (
                    <div style={{
                      position: "absolute", inset: -4, border: `2px solid ${theme.ink}`, borderRadius: 5,
                      opacity: 1 - checkPulse, transform: `scale(${1 + checkPulse * 0.6})`,
                    }} />
                  )}
                </div>
                <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.ink }}>{row.t}</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 12, color: theme.muted }}>({row.y})</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
