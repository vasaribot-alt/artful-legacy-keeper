import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const PARAGRAPHS = [
  "Vapor — A Survey gathers six years of Marit Solberg's painting practice, tracing the artist's pursuit of light as material. Working in oil on linen, Solberg builds her surfaces in transparent layers — each one veiling the last, until the painting reads as a slow exhalation rather than a fixed image.",
  "Curated by Ida Holm, the exhibition opens with the earliest Vapor canvases (2021) and closes with three new large-scale works completed during a residency at Cité Internationale des Arts in Paris. A separate room presents preparatory studies and a film essay by the artist.",
  "Vapor — A Survey is supported by the Norwegian Arts Council and Kunsthalle Bergen. A 96-page catalogue with essays by Marte Aas and Stian Gabrielsen accompanies the exhibition.",
];

export const SceneExhibitionText: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 100 } });

  const headingS = spring({ frame: frame - 30, fps, config: { damping: 22, stiffness: 110 } });

  // Paragraphs reveal as they're "typed in" — fade up staggered
  const paraDelays = [50, 110, 175];

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 64 }}>
      <div style={{ width: 380, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 04</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          The<br/><span style={{ fontStyle: "italic" }}>text.</span>
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 20, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Press release, curator statement, catalogue note — preserved alongside the show.
        </div>
      </div>

      <div style={{
        width: 760, padding: "44px 56px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        minHeight: 560,
      }}>
        <div style={{
          fontFamily: "DM Sans", fontSize: 11, color: theme.muted,
          letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10,
          opacity: headingS,
        }}>
          Exhibition text — press release
        </div>
        <div style={{
          fontFamily: "DM Serif Display", fontSize: 38, lineHeight: 1.05, color: theme.ink,
          letterSpacing: "-0.02em", marginBottom: 28,
          opacity: headingS, transform: `translateY(${(1 - headingS) * 12}px)`,
        }}>
          Vapor — A Survey
        </div>

        {PARAGRAPHS.map((p, i) => {
          const s = spring({ frame: frame - paraDelays[i], fps, config: { damping: 22, stiffness: 90 } });
          return (
            <p key={i} style={{
              fontFamily: "DM Serif Display", fontSize: 19, lineHeight: 1.55,
              color: theme.inkSoft, marginTop: 0, marginBottom: 18,
              opacity: s, transform: `translateY(${(1 - s) * 14}px)`,
            }}>
              {p}
            </p>
          );
        })}

        {/* save indicator */}
        <div style={{
          marginTop: 22, display: "flex", alignItems: "center", gap: 8,
          fontFamily: "DM Sans", fontSize: 12, color: theme.muted,
          letterSpacing: "0.15em", textTransform: "uppercase",
          opacity: interpolate(frame, [210, 230], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: theme.ink }} />
          Saved — autosynced to public exhibition page
        </div>
      </div>
    </AbsoluteFill>
  );
};
