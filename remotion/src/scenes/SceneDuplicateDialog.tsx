import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

// Scene: the "Add Artwork" dialog opens pre-filled — all metadata copied, images empty,
// title has "(copy)" appended. A caret appears in the title field and edits the title.
export const SceneDuplicateDialog: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dialogIn = spring({ frame, fps, config: { damping: 22, stiffness: 90 } });
  const overlayO = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  // Sequence of highlights on fields (year, medium, dimensions...) pulsing
  const fields = [
    { label: "TITLE", value: "Untitled (Vapor) (copy)", at: 30, highlight: true, isTitle: true },
    { label: "YEAR", value: "2024", at: 45 },
    { label: "MEDIUM", value: "Oil on linen", at: 60 },
    { label: "DIMENSIONS", value: "120 × 90 cm", at: 75 },
    { label: "SERIES", value: "Studio Notes", at: 90 },
  ];

  // Title edit: erase "(copy)" trail then type "II"
  const editStart = 130;
  const original = "Untitled (Vapor) (copy)";
  const target = "Untitled (Vapor) II";

  let displayTitle = original;
  if (frame >= editStart) {
    const eraseTo = original.length - " (copy)".length; // "Untitled (Vapor)"
    const eraseDur = 24;
    const eraseFrac = interpolate(frame, [editStart, editStart + eraseDur], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    const currentLen = Math.round(original.length - (original.length - eraseTo) * eraseFrac);
    displayTitle = original.slice(0, Math.max(currentLen, eraseTo));

    // After erase, type " II"
    const typeStart = editStart + eraseDur + 6;
    if (frame >= typeStart) {
      const tail = " II";
      const typeDur = 18;
      const tFrac = interpolate(frame, [typeStart, typeStart + typeDur], [0, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
      const tLen = Math.round(tail.length * tFrac);
      displayTitle = target.slice(0, eraseTo) + tail.slice(0, tLen);
    }
  }

  const caretBlink = Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Dimmed backdrop */}
      <AbsoluteFill style={{ background: `${theme.ink}55`, opacity: overlayO }} />

      {/* Dialog card */}
      <div style={{
        width: 720, background: theme.card,
        borderRadius: 6, border: `1px solid ${theme.ink}18`,
        padding: 40,
        opacity: dialogIn, transform: `translateY(${(1 - dialogIn) * 40}px) scale(${0.96 + dialogIn * 0.04})`,
        boxShadow: "0 60px 100px -30px rgba(0,0,0,0.4)",
        fontFamily: "DM Sans",
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.3em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 8,
        }}>Duplicate artwork</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 30, color: theme.ink,
          letterSpacing: "-0.02em", marginBottom: 28,
        }}>Everything, minus the photos.</div>

        {/* Image placeholder row */}
        <div style={{
          height: 78, borderRadius: 6, border: `2px dashed ${theme.ink}20`,
          background: `${theme.ink}04`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: theme.muted, fontSize: 12, letterSpacing: "0.2em",
          textTransform: "uppercase", marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 20, height: 16, border: `1.6px solid ${theme.muted}`, borderRadius: 2, position: "relative",
            }}>
              <div style={{ position: "absolute", bottom: 2, left: 2, width: 5, height: 5, borderRadius: "50%", background: theme.muted }} />
            </div>
            <span>Photos will be added next</span>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {fields.map((f, i) => {
            const o = interpolate(frame, [f.at, f.at + 14], [0, 1], { extrapolateRight: "clamp" });
            const pulseAt = f.at + 8;
            const pulse = interpolate(frame, [pulseAt, pulseAt + 12, pulseAt + 26], [0, 1, 0], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            return (
              <div key={i} style={{
                opacity: o, transform: `translateY(${(1 - o) * 8}px)`,
              }}>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", color: theme.muted, marginBottom: 6 }}>
                  {f.label}
                </div>
                <div style={{
                  height: 46, borderRadius: 4,
                  background: theme.card,
                  border: `1px solid ${theme.ink}${f.isTitle && frame >= editStart ? "40" : "18"}`,
                  boxShadow: `0 0 0 ${pulse * 3}px ${theme.ink}10`,
                  display: "flex", alignItems: "center", padding: "0 14px",
                  fontSize: 15, color: theme.ink,
                }}>
                  {f.isTitle ? (
                    <>
                      <span>{displayTitle}</span>
                      {frame >= editStart && (
                        <span style={{
                          display: "inline-block", width: 2, height: 20,
                          background: theme.ink, marginLeft: 2,
                          opacity: caretBlink ? 1 : 0,
                        }} />
                      )}
                    </>
                  ) : (
                    f.value
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div style={{
          marginTop: 28, display: "flex", justifyContent: "flex-end", gap: 10,
          opacity: interpolate(frame, [100, 130], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          <div style={{
            padding: "10px 18px", borderRadius: 4, fontSize: 13,
            border: `1px solid ${theme.ink}20`, color: theme.inkSoft,
          }}>Cancel</div>
          <div style={{
            padding: "10px 20px", borderRadius: 4, fontSize: 13,
            background: theme.ink, color: theme.card, fontWeight: 500,
          }}>Save & continue</div>
        </div>
      </div>

      {/* Side caption */}
      <div style={{
        position: "absolute", right: 100, top: 100, maxWidth: 320, textAlign: "right",
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.25em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 12,
          opacity: interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" }),
        }}>Step 02</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 44, lineHeight: 1.05,
          color: theme.ink, letterSpacing: "-0.02em",
          opacity: interpolate(frame, [18, 50], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Metadata <span style={{ fontStyle: "italic" }}>pre-filled.</span>
        </div>
        <div style={{
          fontFamily: "DM Sans", fontSize: 17, color: theme.inkSoft, marginTop: 18, lineHeight: 1.5,
          opacity: interpolate(frame, [40, 76], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Retitle, tweak the year or edition — everything else stays.
        </div>
      </div>
    </AbsoluteFill>
  );
};
