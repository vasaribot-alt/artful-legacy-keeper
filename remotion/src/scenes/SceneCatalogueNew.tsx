import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const typed = (full: string, frame: number, start: number, perChar = 1.5) => {
  const n = Math.max(0, Math.floor((frame - start) / perChar));
  return full.slice(0, Math.min(n, full.length));
};

export const SceneCatalogueNew: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  const title = typed("Elin Vandermeer — Vapor", frame, 22);
  const year = typed("2026", frame, 90);
  const isbn = typed("978-3-86335-512-9", frame, 118);
  const publisher = typed("Walther König, Köln", frame, 162);
  const authors = typed("Hanne De Wachter, Stefan Brüggemann", frame, 210);
  const lang = typed("English / Deutsch", frame, 254);
  const pages = typed("184", frame, 280);

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ width: 380, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 01</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          New<br/>catalogue.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Title, publisher, ISBN — bibliographic precision.
        </div>
      </div>

      <div style={{
        width: 780, padding: "48px 56px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        <div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 28, color: theme.ink }}>Add Catalogue</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, color: theme.muted, marginTop: 4 }}>Indexed by ISBN and linkable to works.</div>
        </div>

        <Field label="CATALOGUE TITLE *" value={title} cursor={frame < 90} big />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
          <Field label="PUBLICATION YEAR" value={year} cursor={frame > 90 && frame < 118} />
          <Field label="ISBN" value={isbn} mono cursor={frame > 118 && frame < 162} />
        </div>

        <Field label="PUBLISHER" value={publisher} cursor={frame > 162 && frame < 210} />
        <Field label="AUTHORS" value={authors} cursor={frame > 210 && frame < 254} />

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
          <Field label="LANGUAGE" value={lang} cursor={frame > 254 && frame < 280} />
          <Field label="PRINT LENGTH" value={pages ? `${pages} pages` : ""} cursor={frame > 280 && frame < 310} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Field: React.FC<{ label: string; value: string; cursor?: boolean; big?: boolean; mono?: boolean }> = ({ label, value, cursor, big, mono }) => (
  <div>
    <div style={{ fontSize: 10, color: theme.muted, marginBottom: 6, letterSpacing: "0.18em" }}>{label}</div>
    <div style={{
      height: big ? 54 : 42, borderBottom: `1.5px solid ${theme.ink}`,
      display: "flex", alignItems: "center",
      fontSize: big ? 24 : 17, color: theme.ink,
      fontFamily: big ? "DM Serif Display" : mono ? "ui-monospace, Menlo, monospace" : "DM Sans",
    }}>
      <span>
        {value}
        {cursor && <span style={{ color: theme.ink, marginLeft: 2 }}>|</span>}
      </span>
    </div>
  </div>
);
