import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

export const SceneTitleDuplicate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const kickerO = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const lineS = spring({ frame: frame - 14, fps, config: { damping: 22, stiffness: 90 } });
  const subO = interpolate(frame, [40, 68], [0, 1], { extrapolateRight: "clamp" });

  // Two overlapping cards (original + copy)
  const cardA = spring({ frame: frame - 26, fps, config: { damping: 24, stiffness: 70 } });
  const cardB = spring({ frame: frame - 54, fps, config: { damping: 22, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 100, maxWidth: 1600 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "DM Sans", fontSize: 17, letterSpacing: "0.32em",
            textTransform: "uppercase", color: theme.muted, marginBottom: 28, opacity: kickerO,
          }}>Tutorial · Duplicate</div>

          <div style={{
            fontFamily: "DM Serif Display", fontSize: 128, lineHeight: 0.96,
            color: theme.ink, letterSpacing: "-0.03em",
            opacity: lineS, transform: `translateY(${(1 - lineS) * 30}px)`,
          }}>
            One work,<br/>many <span style={{ fontStyle: "italic" }}>editions.</span>
          </div>

          <div style={{
            fontFamily: "DM Sans", fontSize: 22, color: theme.inkSoft, marginTop: 36,
            maxWidth: 540, lineHeight: 1.5, opacity: subO,
          }}>
            Duplicate an existing artwork to keep the metadata — then Capture fresh photos.
          </div>
        </div>

        {/* Stacked cards */}
        <div style={{ position: "relative", width: 460, height: 560 }}>
          {/* Back card (original) */}
          <div style={{
            position: "absolute", top: 40, left: 0,
            width: 380, height: 480, borderRadius: 6, overflow: "hidden",
            background: theme.card, border: `1px solid ${theme.ink}15`,
            opacity: cardA, transform: `translateY(${(1 - cardA) * 40}px) rotate(-3deg)`,
            boxShadow: "0 30px 60px -20px rgba(0,0,0,0.25)",
          }}>
            <Img src={staticFile("images/art1.jpg")} style={{
              width: "100%", height: "72%", objectFit: "cover", filter: "grayscale(100%)",
            }} />
            <div style={{ padding: 18, fontFamily: "DM Sans" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.ink }}>Untitled (Vapor)</div>
              <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>2024 · Oil on linen</div>
            </div>
          </div>

          {/* Front card (copy) */}
          <div style={{
            position: "absolute", top: 0, left: 80,
            width: 380, height: 480, borderRadius: 6, overflow: "hidden",
            background: theme.card, border: `1px solid ${theme.ink}20`,
            opacity: cardB, transform: `translateY(${(1 - cardB) * 40}px) rotate(4deg)`,
            boxShadow: "0 40px 80px -20px rgba(0,0,0,0.3)",
          }}>
            <div style={{
              width: "100%", height: "72%",
              background: `${theme.ink}08`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 8,
              color: theme.muted, fontFamily: "DM Sans",
            }}>
              <div style={{
                width: 44, height: 34, border: `2px solid ${theme.muted}`, borderRadius: 6, position: "relative",
              }}>
                <div style={{ position: "absolute", top: -6, left: 10, width: 14, height: 8, border: `2px solid ${theme.muted}`, borderBottom: "none", borderRadius: "3px 3px 0 0" }} />
                <div style={{ position: "absolute", top: 6, left: 10, width: 18, height: 18, border: `2px solid ${theme.muted}`, borderRadius: "50%" }} />
              </div>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>Awaiting photos</div>
            </div>
            <div style={{ padding: 18, fontFamily: "DM Sans" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.ink }}>
                Untitled (Vapor) <span style={{ color: theme.muted, fontWeight: 400, fontStyle: "italic" }}>(copy)</span>
              </div>
              <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>2024 · Oil on linen</div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
