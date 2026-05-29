import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

const TILES = ["install1.jpg", "install2.jpg", "install3.jpg", "install4.jpg", "install5.jpg", "install6.jpg"];

export const SceneInstallationViews: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });

  // Tiles stagger in
  const tileFor = (i: number) => spring({ frame: frame - (20 + i * 10), fps, config: { damping: 22, stiffness: 110 } });

  // Drag tile 0 → swap into position 4 between frame 130-180
  const dragStart = 132;
  const dragEnd = 178;
  const dragP = interpolate(frame, [dragStart, dragEnd], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const dragging = frame >= dragStart && frame <= dragEnd;
  // Source slot 0 at col0,row0; target slot 4 at col1,row1 (in 3-col grid → col1,row1)
  // tile width 200, gap 14 → dx = (200+14)*1, dy = (200+14)*1
  const dx = dragP * 214;
  const dy = dragP * 214;
  const lift = dragging ? 1 - Math.abs(dragP - 0.5) * 0.3 : 1;
  const dragShadow = dragging ? 0.55 : 0;

  // Caption panel opens for tile 2 at frame 200
  const captionOpen = interpolate(frame, [200, 224], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const photoText = "Photo: M. Reinholdt".slice(0, Math.max(0, Math.floor((frame - 222) / 1.6)));
  const captionText = "Vapor IV, Oil on linen, 2026".slice(0, Math.max(0, Math.floor((frame - 240) / 1.4)));

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 64 }}>
      <div style={{ width: 380, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 02</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Installation<br/><span style={{ fontStyle: "italic" }}>views.</span>
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 20, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Drag to reorder. Credit your photographer — a courtesy to the people who make the documentation possible.
        </div>
      </div>

      <div style={{
        width: 720, padding: 36, background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 24, color: theme.ink }}>Installation views</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 12, color: theme.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>6 of 24</div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 200px)", gap: 14,
          position: "relative",
        }}>
          {TILES.map((src, i) => {
            const s = tileFor(i);
            const isDraggedTile = i === 0;
            const isTargetTile = i === 4;
            const transform = isDraggedTile && dragging
              ? `translate(${dx}px, ${dy}px) scale(${lift})`
              : `scale(${s})`;
            const opacity = s;
            const z = isDraggedTile && dragging ? 10 : 1;
            const showCaptionPulse = i === 2 && captionOpen > 0;
            return (
              <div key={i} style={{
                position: "relative", width: 200, height: 200, borderRadius: 4, overflow: "hidden",
                background: theme.bgDeep, opacity, transform,
                zIndex: z,
                boxShadow: isDraggedTile && dragging
                  ? `0 30px 50px -10px rgba(0,0,0,${dragShadow})`
                  : "0 1px 0 rgba(0,0,0,0.04)",
                outline: showCaptionPulse ? `2px solid ${theme.ink}` : "none",
                outlineOffset: 3,
              }}>
                <Img src={staticFile(`images/${src}`)} style={{
                  width: "100%", height: "100%", objectFit: "cover",
                }} />
                {/* drop target indicator */}
                {isTargetTile && dragging && dragP > 0.2 && (
                  <div style={{
                    position: "absolute", inset: 0, border: `2px dashed ${theme.ink}`,
                    background: `${theme.ink}08`,
                  }} />
                )}
                {/* tile index label */}
                <div style={{
                  position: "absolute", left: 8, top: 8,
                  padding: "2px 7px", background: theme.ink, color: theme.bg,
                  fontFamily: "DM Sans", fontSize: 10, letterSpacing: "0.1em",
                }}>{String(i + 1).padStart(2, "0")}</div>
              </div>
            );
          })}
        </div>

        {/* caption editor that pops up for tile 3 */}
        <div style={{
          marginTop: 22, padding: 18,
          border: `1px solid ${theme.ink}15`, borderRadius: 6, background: "#FBFAF7",
          opacity: captionOpen, transform: `translateY(${(1 - captionOpen) * 10}px)`,
        }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.18em", color: theme.muted, marginBottom: 10 }}>
            IMAGE 03 — CAPTION & CREDIT
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 9, color: theme.muted, marginBottom: 4, letterSpacing: "0.15em" }}>CAPTION</div>
              <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.ink, minHeight: 22 }}>
                {captionText}
                {captionText.length > 0 && captionText.length < 28 && <span style={{ marginLeft: 1 }}>|</span>}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: theme.muted, marginBottom: 4, letterSpacing: "0.15em" }}>PHOTO CREDIT</div>
              <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.ink, minHeight: 22 }}>
                {photoText}
                {photoText.length > 0 && photoText.length < 18 && <span style={{ marginLeft: 1 }}>|</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* cursor for the drag */}
      {dragging && (
        <svg width="32" height="32" viewBox="0 0 24 24" style={{
          position: "absolute",
          left: `calc(50% + ${-120 + dx}px)`,
          top: `calc(50% + ${-110 + dy}px)`,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          zIndex: 20,
        }}>
          <path d="M3 2 L3 20 L8 15 L11 22 L14 21 L11 14 L18 14 Z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
