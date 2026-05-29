import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const SceneTitleBulk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const kickerO = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const lineS = spring({ frame: frame - 14, fps, config: { damping: 22, stiffness: 90 } });
  const subO = interpolate(frame, [38, 64], [0, 1], { extrapolateRight: "clamp" });

  // Three floating spreadsheet rows that drift in from the right
  const rowO = (d: number) => interpolate(frame, [40 + d, 70 + d], [0, 1], { extrapolateRight: "clamp" });
  const rowX = (d: number) => interpolate(frame, [40 + d, 80 + d], [80, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 90, maxWidth: 1500 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "DM Sans", fontSize: 17, letterSpacing: "0.32em",
            textTransform: "uppercase", color: theme.muted, marginBottom: 28, opacity: kickerO,
          }}>Tutorial 03</div>

          <div style={{
            fontFamily: "DM Serif Display", fontSize: 132, lineHeight: 0.96,
            color: theme.ink, letterSpacing: "-0.03em",
            opacity: lineS, transform: `translateY(${(1 - lineS) * 30}px)`,
          }}>
            Import<br/>your entire<br/><span style={{ fontStyle: "italic" }}>catalogue.</span>
          </div>

          <div style={{
            fontFamily: "DM Sans", fontSize: 22, color: theme.inkSoft, marginTop: 36,
            maxWidth: 520, lineHeight: 1.5, opacity: subO,
          }}>
            One spreadsheet, hundreds of works.
          </div>
        </div>

        <div style={{ width: 520, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { d: 0, t: "Untitled (Vapor)", y: "2024", m: "Oil on linen" },
            { d: 18, t: "Nocturne IV", y: "2023", m: "Photograph" },
            { d: 36, t: "Pale Field", y: "2023", m: "Acrylic on board" },
          ].map((r) => (
            <div key={r.t} style={{
              display: "grid", gridTemplateColumns: "1fr 70px 200px",
              gap: 18, padding: "16px 20px",
              background: theme.card, borderRadius: 6,
              boxShadow: "0 14px 30px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
              fontFamily: "DM Sans", fontSize: 16, color: theme.ink,
              opacity: rowO(r.d), transform: `translateX(${rowX(r.d)}px)`,
            }}>
              <div style={{ fontFamily: "DM Serif Display", fontSize: 19 }}>{r.t}</div>
              <div style={{ color: theme.muted }}>{r.y}</div>
              <div style={{ color: theme.inkSoft }}>{r.m}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
