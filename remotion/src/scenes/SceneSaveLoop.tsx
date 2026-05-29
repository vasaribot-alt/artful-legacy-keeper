import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { theme } from "../theme";
import { PhoneFrame, PhoneHeader } from "../components/PhoneFrame";

// Each save tap adds a new tile to "This session"
const SAVES = [
  { at: 20, src: "images/art1.jpg", t: "Untitled (Vapor IV)" },
  { at: 70, src: "images/art3.jpg", t: "Nocturne" },
  { at: 120, src: "images/art4.jpg", t: "Pale Field" },
  { at: 170, src: "images/art5.jpg", t: "Drift" },
];

export const SceneSaveLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <PhoneFrame opacity={phoneIn} translateY={(1 - phoneIn) * 40}>
        <PhoneHeader title="Capture" />

        <div style={{ padding: 18, flex: 1, fontFamily: "DM Sans", overflow: "hidden" }}>
          {/* Big toast confirmation that pulses each save */}
          {SAVES.map((s) => {
            const local = frame - s.at;
            if (local < 0 || local > 40) return null;
            const o = interpolate(local, [0, 8, 32, 40], [0, 1, 1, 0]);
            const y = interpolate(local, [0, 10], [-20, 0], { extrapolateRight: "clamp" });
            return (
              <div key={s.at} style={{
                position: "absolute", top: 80, left: 18, right: 18,
                padding: "12px 14px", borderRadius: 8,
                background: theme.ink, color: theme.card,
                fontFamily: "DM Sans", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 10,
                opacity: o, transform: `translateY(${y}px)`,
                zIndex: 30,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: theme.card,
                  color: theme.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                }}>✓</div>
                Artwork captured
              </div>
            );
          })}

          {/* Empty capture zone */}
          <div style={{
            width: "100%", aspectRatio: "4/3", borderRadius: 12,
            border: `2px dashed ${theme.ink}25`, background: `${theme.ink}05`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: theme.muted, gap: 8,
          }}>
            <div style={{ fontSize: 26 }}>○</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>Take photo</div>
            <div style={{ fontSize: 11 }}>Ready for next work</div>
          </div>

          {/* Title field reset */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9, color: theme.muted, marginBottom: 4, letterSpacing: "0.12em" }}>TITLE *</div>
            <div style={{
              height: 36, borderRadius: 5, border: `1px solid ${theme.ink}15`, background: theme.card,
              padding: "0 12px", display: "flex", alignItems: "center", fontSize: 14, color: theme.muted, fontFamily: "DM Sans",
            }}>Untitled</div>
          </div>

          {/* This session strip */}
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 9, color: theme.muted, marginBottom: 8, letterSpacing: "0.18em" }}>THIS SESSION</div>
            <div style={{ display: "flex", gap: 8 }}>
              {SAVES.map((s) => {
                const visAt = s.at + 28;
                if (frame < visAt) return null;
                const sp = spring({ frame: frame - visAt, fps, config: { damping: 16, stiffness: 140 } });
                return (
                  <div key={s.at} style={{
                    flexShrink: 0, transform: `scale(${0.5 + sp * 0.5})`, opacity: sp,
                  }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.ink}15`,
                    }}>
                      <Img src={staticFile(s.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} />
                    </div>
                    <div style={{ fontSize: 8, marginTop: 4, color: theme.muted, textAlign: "center", width: 60, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.t}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save bar with "Save & add another" highlighted */}
        <div style={{ padding: 14, borderTop: `1px solid ${theme.ink}12`, display: "flex", gap: 8 }}>
          <div style={{
            flex: 1, height: 42, borderRadius: 6, background: theme.ink, color: theme.card,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "DM Sans", fontSize: 12, fontWeight: 600,
            transform: SAVES.some(s => frame >= s.at && frame < s.at + 10) ? "scale(0.97)" : "scale(1)",
          }}>✓ Save & add another</div>
          <div style={{
            flex: 1, height: 42, borderRadius: 6, border: `1px solid ${theme.ink}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "DM Sans", fontSize: 12, color: theme.ink, fontWeight: 600,
          }}>Save & open</div>
        </div>
      </PhoneFrame>

      <div style={{
        position: "absolute", left: 140, top: "50%", transform: "translateY(-50%)",
        maxWidth: 340,
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.25em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 14,
        }}>Step 03</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 56, lineHeight: 1.05,
          color: theme.ink, letterSpacing: "-0.02em",
        }}>
          Save &<br/><span style={{ fontStyle: "italic" }}>keep going.</span>
        </div>
        <div style={{
          fontFamily: "DM Sans", fontSize: 17, color: theme.inkSoft, marginTop: 18, lineHeight: 1.5,
        }}>
          One tap resets the form. Catalogue your entire studio session without breaking flow.
        </div>
      </div>
    </AbsoluteFill>
  );
};
