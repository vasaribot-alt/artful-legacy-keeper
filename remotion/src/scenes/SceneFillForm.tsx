import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { theme } from "../theme";
import { PhoneFrame, PhoneHeader } from "../components/PhoneFrame";

const typed = (full: string, frame: number, start: number, perChar = 1.5) => {
  const n = Math.max(0, Math.floor((frame - start) / perChar));
  return full.slice(0, Math.min(n, full.length));
};

export const SceneFillForm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });

  const title = typed("Untitled (Vapor IV)", frame, 18);
  const year = typed("2026", frame, 70);
  const series = typed("Vapor", frame, 95);
  const medium = typed("Oil", frame, 130);
  const support = typed("Linen", frame, 150);
  const H = typed("120", frame, 180);
  const W = typed("90", frame, 195);
  const D = typed("3", frame, 210);

  // Type dropdown selects "Painting" at frame 50
  const typePicked = frame > 50;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <PhoneFrame opacity={phoneIn} translateY={(1 - phoneIn) * 40}>
        <PhoneHeader title="Capture" />

        <div style={{ padding: 18, flex: 1, overflow: "hidden", fontFamily: "DM Sans" }}>
          {/* Thumbnails row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 14 }}>
            {["art1.jpg", "art3.jpg", "art4.jpg"].map((s) => (
              <div key={s} style={{
                aspectRatio: "1", borderRadius: 6, overflow: "hidden", border: `1px solid ${theme.ink}15`,
              }}>
                <Img src={staticFile(`images/${s}`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} />
              </div>
            ))}
            <div style={{
              aspectRatio: "1", borderRadius: 6, border: `2px dashed ${theme.ink}25`,
              display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, fontSize: 9,
            }}>+ ADD</div>
          </div>

          {/* Form fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="TITLE *" value={title} cursor={frame < 50} />
            <Field label="TYPE OF ARTWORK" value={typePicked ? "Painting" : ""} dropdown />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="DATE" value={year} cursor={frame > 70 && frame < 90} />
              <Field label="SERIES" value={series} cursor={frame > 95 && frame < 125} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="MEDIUM" value={medium} cursor={frame > 130 && frame < 148} />
              <Field label="SUPPORT" value={support} cursor={frame > 150 && frame < 175} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: theme.muted, marginBottom: 4, letterSpacing: "0.12em" }}>DIMENSIONS (CM)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[H, W, D].map((v, i) => (
                  <div key={i} style={{
                    height: 36, borderRadius: 5, border: `1px solid ${theme.ink}15`, background: theme.card,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: theme.ink, fontFamily: "DM Serif Display",
                  }}>{v || (["H","W","D"][i])}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky bottom save bar */}
        <div style={{
          padding: 14, borderTop: `1px solid ${theme.ink}12`, display: "flex", gap: 8,
        }}>
          <div style={{
            flex: 1, height: 42, borderRadius: 6, border: `1px solid ${theme.ink}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "DM Sans", fontSize: 12, color: theme.ink, fontWeight: 600,
          }}>✓ Save & add another</div>
          <div style={{
            flex: 1, height: 42, borderRadius: 6, background: theme.ink, color: theme.card,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "DM Sans", fontSize: 12, fontWeight: 600,
          }}>Save & open</div>
        </div>
      </PhoneFrame>

      <div style={{
        position: "absolute", right: 140, top: "50%", transform: "translateY(-50%)",
        maxWidth: 340, textAlign: "right",
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.25em",
          textTransform: "uppercase", color: theme.muted, marginBottom: 14,
        }}>Step 02</div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 56, lineHeight: 1.05,
          color: theme.ink, letterSpacing: "-0.02em",
        }}>
          Log the <span style={{ fontStyle: "italic" }}>essentials.</span>
        </div>
        <div style={{
          fontFamily: "DM Sans", fontSize: 17, color: theme.inkSoft, marginTop: 18, lineHeight: 1.5,
        }}>
          Title, medium, dimensions — designed for one-hand entry.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Field: React.FC<{ label: string; value: string; cursor?: boolean; dropdown?: boolean }> = ({ label, value, cursor, dropdown }) => (
  <div>
    <div style={{ fontSize: 9, color: theme.muted, marginBottom: 4, letterSpacing: "0.12em" }}>{label}</div>
    <div style={{
      height: 36, borderRadius: 5, border: `1px solid ${theme.ink}15`, background: theme.card,
      padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
      fontSize: 14, color: value ? theme.ink : theme.muted, fontFamily: "DM Sans",
    }}>
      <span>
        {value || (dropdown ? "Select type…" : "")}
        {cursor && <span style={{ color: theme.ink, marginLeft: 1 }}>|</span>}
      </span>
      {dropdown && <span style={{ color: theme.muted, fontSize: 10 }}>▾</span>}
    </div>
  </div>
);
