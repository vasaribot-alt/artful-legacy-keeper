import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

const ITEMS = [
  { cover: "images/catalogue-cover.jpg", title: "Vapor — A Survey",        authors: "Hanne De Wachter, Stefan Brüggemann", pub: "Walther König, Köln", year: 2026, isbn: "978-3-86335-512-9", lang: "English / Deutsch", pages: 184 },
  { cover: "images/install2.jpg",        title: "Slow Horizons",            authors: "Marie Lefèvre",                       pub: "JRP|Editions, Genève",  year: 2024, isbn: "978-3-03764-688-1", lang: "English / Français", pages: 128 },
  { cover: "images/install4.jpg",        title: "Nocturnes",                authors: "Annika Strauss",                      pub: "Hatje Cantz, Berlin",   year: 2022, isbn: "978-3-7757-5210-3", lang: "English",            pages: 96  },
];

export const SceneCatalogueLibrary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const headS = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 130 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 360, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 03</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Your<br/>library.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Every publication — sorted by year,
          searchable by ISBN.
        </div>
      </div>

      <div style={{
        width: 920, padding: "36px 40px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        opacity: headS, transform: `translateY(${(1 - headS) * 60}px)`,
      }}>
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          paddingBottom: 20, borderBottom: `1px solid ${theme.ink}10`, marginBottom: 22,
        }}>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 26, color: theme.ink }}>Catalogues</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 12, color: theme.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            3 publications
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ITEMS.map((it, i) => {
            const d = 14 + i * 12;
            const s = spring({ frame: frame - d, fps, config: { damping: 22, stiffness: 130 } });
            return (
              <div key={it.title} style={{
                display: "flex", gap: 22, padding: "18px 20px", border: `1px solid ${theme.ink}10`,
                borderRadius: 4, opacity: s, transform: `translateY(${(1 - s) * 16}px)`,
              }}>
                <div style={{
                  width: 96, height: 132, background: "#1a1a1a", overflow: "hidden",
                  boxShadow: "0 8px 20px -6px rgba(0,0,0,0.3)", flexShrink: 0,
                }}>
                  <Img src={staticFile(it.cover)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: i === 0 ? "none" : "grayscale(1)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontFamily: "DM Serif Display", fontSize: 22, color: theme.ink, lineHeight: 1.2 }}>{it.title}</div>
                  <div style={{ fontFamily: "DM Sans", fontSize: 13, color: theme.inkSoft, marginTop: 4 }}>by {it.authors}</div>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px",
                    marginTop: 12, fontFamily: "DM Sans", fontSize: 12, color: theme.inkSoft,
                  }}>
                    <Row k="Publisher" v={it.pub} />
                    <Row k="Year"      v={String(it.year)} />
                    <Row k="Language"  v={it.lang} />
                    <Row k="ISBN"      v={it.isbn} mono />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{ k: string; v: string; mono?: boolean }> = ({ k, v, mono }) => (
  <div style={{ display: "flex", gap: 8 }}>
    <span style={{ color: theme.muted }}>{k} :</span>
    <span style={{ fontFamily: mono ? "ui-monospace, Menlo, monospace" : "DM Sans" }}>{v}</span>
  </div>
);
