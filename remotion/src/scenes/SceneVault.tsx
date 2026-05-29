import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const SceneVault: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 20, stiffness: 100 } });
  const lineW = interpolate(frame, [12, 50], [0, 1], { extrapolateRight: "clamp" });

  const cards = [
    { label: "Add your CV", num: "01" },
    { label: "Upload artworks", num: "02" },
    { label: "Document exhibitions", num: "03" },
  ];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ textAlign: "center", transform: `translateY(${(1 - titleS) * 30}px)`, opacity: titleS }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 18, letterSpacing: "0.35em", textTransform: "uppercase", color: theme.muted, marginBottom: 24 }}>
          Welcome to your vault
        </div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 140, lineHeight: 0.95, color: theme.ink, letterSpacing: "-0.02em" }}>
          You're in.
        </div>
        <div style={{ width: `${lineW * 240}px`, height: 2, background: theme.ink, margin: "32px auto 0" }} />
      </div>

      <div style={{ display: "flex", gap: 28 }}>
        {cards.map((c, i) => {
          const s = spring({ frame: frame - 30 - i * 10, fps, config: { damping: 22, stiffness: 110 } });
          return (
            <div key={i} style={{
              width: 320, height: 220, background: theme.card, borderRadius: 8,
              boxShadow: "0 24px 60px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
              padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between",
              transform: `translateY(${(1 - s) * 30}px)`, opacity: s,
            }}>
              <div style={{ fontFamily: "DM Serif Display", fontSize: 56, color: theme.ink, opacity: 0.18 }}>{c.num}</div>
              <div style={{ fontFamily: "DM Sans", fontSize: 26, color: theme.ink, lineHeight: 1.2 }}>{c.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 12, fontFamily: "DM Sans", fontSize: 18, color: theme.muted, letterSpacing: "0.25em", textTransform: "uppercase",
        opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        Next tutorial — How to fill in your profile
      </div>
    </AbsoluteFill>
  );
};
