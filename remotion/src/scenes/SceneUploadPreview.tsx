import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const PREVIEW = [
  { title: "Untitled (Vapor)", cat: "Painting", year: "2024", dims: "180 × 140 cm", img: "IMG_2401.jpg" },
  { title: "Nocturne IV", cat: "Photography", year: "2023", dims: "60 × 90 cm", img: "IMG_2402.jpg" },
  { title: "Pale Field", cat: "Painting", year: "2023", dims: "70 × 90 cm", img: "IMG_2403.jpg" },
  { title: "Slow Light", cat: "Painting", year: "2022", dims: "200 × 160 cm", img: "IMG_2404.jpg" },
  { title: "Margin Study", cat: "Drawing", year: "2022", dims: "42 × 30 cm", img: "IMG_2405.jpg" },
];

export const SceneUploadPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  // Phase 1 (0-110): upload zone with file dropping in
  const fileO = interpolate(frame, [30, 50, 86, 96], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fileY = interpolate(frame, [30, 86], [-180, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fileX = interpolate(frame, [30, 86], [120, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dropHi = frame >= 60 && frame < 96 ? 1 : 0;

  // Phase 2 (110+): swap to preview table
  const uploadO = interpolate(frame, [96, 116], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tableO = interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Final import button click
  const cursorO = interpolate(frame, [170, 188], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorX = interpolate(frame, [170, 220], [1240, 1095], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [170, 220], [870, 745], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnPress = frame >= 222 && frame <= 230 ? 0.96 : 1;
  const ringO = interpolate(frame, [224, 248], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringS = interpolate(frame, [224, 248], [0.6, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 360, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 03</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Upload<br/>and review.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          We parse every row so you can confirm before anything is saved.
        </div>
      </div>

      <div style={{
        width: 860, padding: "44px 52px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column", gap: 22,
        position: "relative", minHeight: 600,
      }}>
        <div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 30, color: theme.ink }}>Bulk import</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.muted, marginTop: 4 }}>
            Step 1 of 3 · Upload spreadsheet
          </div>
        </div>

        {/* Phase 1: upload zone */}
        <div style={{
          position: "relative", padding: 60, opacity: uploadO,
          border: `2px dashed ${dropHi ? theme.ink : theme.ink + "30"}`,
          borderRadius: 10, background: dropHi ? "#F5F1EA" : "#FBFAF7",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          minHeight: 360,
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 30, border: `1.5px solid ${theme.ink}40`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: theme.ink,
          }}>↑</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 18, color: theme.ink }}>Drop your spreadsheet</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, color: theme.muted }}>.xlsx or .csv · up to 5,000 rows</div>
        </div>

        {/* Phase 2: preview table */}
        <div style={{
          position: "absolute", left: 52, right: 52, top: 130, bottom: 100,
          opacity: tableO,
        }}>
          <div style={{ display: "flex", gap: 16, padding: "0 8px 10px", borderBottom: `1px solid ${theme.ink}15`,
            fontFamily: "DM Sans", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.muted }}>
            <div style={{ width: 24 }}>✓</div>
            <div style={{ flex: 1 }}>Title</div>
            <div style={{ width: 100 }}>Category</div>
            <div style={{ width: 60 }}>Year</div>
            <div style={{ width: 110 }}>Dimensions</div>
          </div>
          {PREVIEW.map((row, i) => {
            const delay = 130 + i * 8;
            const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 140 } });
            return (
              <div key={row.title} style={{
                display: "flex", gap: 16, padding: "14px 8px", alignItems: "center",
                borderBottom: `1px solid ${theme.ink}10`,
                fontFamily: "DM Sans", fontSize: 15, color: theme.ink,
                opacity: s, transform: `translateY(${(1 - s) * 8}px)`,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 3, background: theme.ink, color: theme.bg,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                }}>✓</div>
                <div style={{ flex: 1, fontFamily: "DM Serif Display", fontSize: 18 }}>{row.title}</div>
                <div style={{ width: 100, color: theme.inkSoft, fontSize: 14 }}>{row.cat}</div>
                <div style={{ width: 60, color: theme.muted, fontSize: 14 }}>{row.year}</div>
                <div style={{ width: 110, color: theme.inkSoft, fontSize: 14, fontFamily: "monospace" }}>{row.dims}</div>
              </div>
            );
          })}
        </div>

        {/* Import button */}
        <div style={{
          position: "absolute", right: 52, bottom: 40, opacity: tableO,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 14, color: theme.muted }}>5 of 5 selected</div>
          <div style={{ position: "relative" }}>
            <div style={{
              padding: "14px 28px", background: theme.ink, color: theme.bg,
              fontFamily: "DM Sans", fontSize: 16, borderRadius: 4,
              transform: `scale(${btnPress})`,
            }}>Import 5 artworks</div>
            <div style={{
              position: "absolute", inset: -8, borderRadius: 10, border: `2px solid ${theme.ink}`,
              opacity: ringO, transform: `scale(${ringS})`, pointerEvents: "none",
            }} />
          </div>
        </div>
      </div>

      {/* floating xlsx file dropping into zone */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: `translate(${fileX}px, ${fileY}px) rotate(${interpolate(frame, [30, 86], [-6, 0])}deg)`,
        opacity: fileO,
        padding: "10px 14px", background: theme.card, borderRadius: 6,
        border: `1px solid ${theme.ink}15`,
        boxShadow: "0 18px 36px -10px rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: "DM Sans", fontSize: 13, color: theme.ink,
      }}>
        <div style={{
          width: 30, height: 30, background: theme.ink, color: theme.bg, borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, letterSpacing: "0.1em",
        }}>XLSX</div>
        <span>artist-template.xlsx</span>
      </div>

      {/* cursor for import click */}
      <svg width="32" height="32" viewBox="0 0 24 24" style={{
        position: "absolute", left: cursorX, top: cursorY, opacity: cursorO,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
      }}>
        <path d="M3 2 L3 20 L8 15 L11 22 L14 21 L11 14 L18 14 Z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};
