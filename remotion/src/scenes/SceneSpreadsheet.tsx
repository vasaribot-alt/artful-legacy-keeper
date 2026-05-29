import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const COLS = [
  { key: "title", label: "Title", width: 220, font: "DM Serif Display" },
  { key: "cat", label: "Category", width: 130 },
  { key: "year", label: "Year", width: 70 },
  { key: "medium", label: "Medium", width: 180 },
  { key: "h", label: "H cm", width: 70 },
  { key: "w", label: "W cm", width: 70 },
  { key: "price", label: "Price (€)", width: 100 },
  { key: "img", label: "Image ID", width: 130 },
];

type Row = Record<string, string>;
const ROWS: Row[] = [
  { title: "Untitled (Vapor)", cat: "Painting", year: "2024", medium: "Oil on linen", h: "180", w: "140", price: "12,000", img: "IMG_2401.jpg" },
  { title: "Nocturne IV", cat: "Photography", year: "2023", medium: "C-print", h: "60", w: "90", price: "3,200", img: "IMG_2402.jpg" },
  { title: "Pale Field", cat: "Painting", year: "2023", medium: "Acrylic on board", h: "70", w: "90", price: "4,400", img: "IMG_2403.jpg" },
  { title: "Slow Light", cat: "Painting", year: "2022", medium: "Oil on canvas", h: "200", w: "160", price: "16,500", img: "IMG_2404.jpg" },
  { title: "Margin Study", cat: "Drawing", year: "2022", medium: "Graphite on paper", h: "42", w: "30", price: "1,100", img: "IMG_2405.jpg" },
];

export const SceneSpreadsheet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const sheetS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 360, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 02</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Fill<br/>the rows.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          One artwork per row. Reference image filenames in the last column.
        </div>
      </div>

      {/* spreadsheet */}
      <div style={{
        width: 1080, background: theme.card, borderRadius: 8, overflow: "hidden",
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - sheetS) * 60}px)`, opacity: sheetS,
      }}>
        {/* faux Excel toolbar */}
        <div style={{
          height: 30, background: "#F0EDE6", borderBottom: `1px solid ${theme.ink}10`,
          display: "flex", alignItems: "center", padding: "0 12px", gap: 8,
          fontFamily: "DM Sans", fontSize: 11, color: theme.muted, letterSpacing: "0.05em",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: "#D9D5CD" }} />
          <div style={{ width: 8, height: 8, borderRadius: 4, background: "#D9D5CD" }} />
          <div style={{ width: 8, height: 8, borderRadius: 4, background: "#D9D5CD" }} />
          <span style={{ marginLeft: 14 }}>artist-template.xlsx — Sheet 1</span>
        </div>

        {/* column letters */}
        <div style={{ display: "flex", background: "#F7F4EE", borderBottom: `1px solid ${theme.ink}10`, fontFamily: "DM Sans", fontSize: 11, color: theme.muted, letterSpacing: "0.1em" }}>
          <div style={{ width: 34, padding: "6px 0", textAlign: "center", borderRight: `1px solid ${theme.ink}10` }}></div>
          {COLS.map((c, i) => (
            <div key={c.key} style={{ width: c.width, padding: "6px 10px", borderRight: `1px solid ${theme.ink}10` }}>
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>

        {/* header row */}
        <div style={{ display: "flex", background: theme.card, borderBottom: `1.5px solid ${theme.ink}` }}>
          <div style={{ width: 34, padding: "10px 0", textAlign: "center", borderRight: `1px solid ${theme.ink}10`, background: "#F7F4EE",
            fontFamily: "DM Sans", fontSize: 11, color: theme.muted }}>1</div>
          {COLS.map((c) => (
            <div key={c.key} style={{
              width: c.width, padding: "10px 12px", borderRight: `1px solid ${theme.ink}10`,
              fontFamily: "DM Sans", fontSize: 13, color: theme.ink, fontWeight: 600,
            }}>{c.label}</div>
          ))}
        </div>

        {/* body rows — animate in one column at a time per row, staggered */}
        {ROWS.map((row, ri) => {
          const rowDelay = 20 + ri * 22;
          return (
            <div key={ri} style={{ display: "flex", borderBottom: `1px solid ${theme.ink}10`, minHeight: 38 }}>
              <div style={{ width: 34, padding: "9px 0", textAlign: "center", borderRight: `1px solid ${theme.ink}10`, background: "#F7F4EE",
                fontFamily: "DM Sans", fontSize: 11, color: theme.muted }}>{ri + 2}</div>
              {COLS.map((c, ci) => {
                const cellDelay = rowDelay + ci * 3;
                const s = spring({ frame: frame - cellDelay, fps, config: { damping: 22, stiffness: 160 } });
                const val = row[c.key] || "";
                const t = Math.min(1, Math.max(0, (frame - cellDelay - 4) / 8));
                const shown = val.slice(0, Math.ceil(t * val.length));
                return (
                  <div key={c.key} style={{
                    width: c.width, padding: "9px 12px", borderRight: `1px solid ${theme.ink}10`,
                    fontFamily: c.font || "DM Sans", fontSize: c.font ? 15 : 13,
                    color: theme.ink, opacity: s, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{shown}</div>
                );
              })}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
