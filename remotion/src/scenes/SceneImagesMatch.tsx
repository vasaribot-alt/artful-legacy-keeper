import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { theme } from "../theme";

const ITEMS = [
  { title: "Untitled (Vapor)", img: "IMG_2401.jpg", src: "images/art1.jpg" },
  { title: "Nocturne IV",      img: "IMG_2402.jpg", src: "images/art2.jpg" },
  { title: "Pale Field",       img: "IMG_2403.jpg", src: "images/art3.jpg" },
  { title: "Slow Light",       img: "IMG_2404.jpg", src: "images/art4.jpg" },
  { title: "Margin Study",     img: "IMG_2405.jpg", src: "images/art5.jpg" },
];

export const SceneImagesMatch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });

  // Stack of image files swooshes in
  const stackO = interpolate(frame, [30, 56], [0, 1], { extrapolateRight: "clamp" });
  const stackY = interpolate(frame, [30, 60], [-60, 0], { extrapolateRight: "clamp" });

  // Drop highlight when stack settles
  const dropHi = frame >= 56 && frame < 90 ? 1 : 0;

  // After "drop" (frame 80): each row's thumbnail fades in + status flips to ✓
  const rowMatchStart = 84;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ width: 360, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 04</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Drop the<br/>images.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          We match filenames to your <em>Image ID</em> column automatically.
        </div>
      </div>

      <div style={{
        width: 880, padding: "40px 48px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column", gap: 22, position: "relative",
      }}>
        <div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 28, color: theme.ink }}>Attach images</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, color: theme.muted, marginTop: 4 }}>
            Step 2 of 3 · Drop image files — matched by filename
          </div>
        </div>

        {/* drop zone with rows inside */}
        <div style={{
          padding: 22, borderRadius: 10,
          border: `2px dashed ${dropHi ? theme.ink : theme.ink + "25"}`,
          background: dropHi ? "#F5F1EA" : "#FBFAF7",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {ITEMS.map((it, i) => {
            const delay = rowMatchStart + i * 14;
            const matchS = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 160 } });
            const matched = frame >= delay + 4;
            return (
              <div key={it.img} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "10px 14px", background: theme.card, borderRadius: 6,
                border: `1px solid ${theme.ink}10`,
              }}>
                {/* thumbnail slot */}
                <div style={{
                  width: 56, height: 56, borderRadius: 4, overflow: "hidden",
                  background: "#F0EDE6", position: "relative", flexShrink: 0,
                }}>
                  <Img src={staticFile(it.src)} style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
                    opacity: matchS, transform: `scale(${0.85 + matchS * 0.15})`, filter: "grayscale(1)",
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "DM Serif Display", fontSize: 19, color: theme.ink }}>{it.title}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: theme.muted, marginTop: 2 }}>{it.img}</div>
                </div>
                {/* status */}
                {matched ? (
                  <div style={{
                    fontFamily: "DM Sans", fontSize: 12, color: theme.ink, letterSpacing: "0.12em",
                    textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6,
                    opacity: matchS, transform: `translateX(${(1 - matchS) * 8}px)`,
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 8, background: theme.ink, color: theme.bg,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                    }}>✓</div>
                    Matched
                  </div>
                ) : (
                  <div style={{
                    fontFamily: "DM Sans", fontSize: 12, color: theme.muted, letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}>Awaiting</div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          fontFamily: "DM Sans", fontSize: 13, color: theme.muted, textAlign: "right",
        }}>
          {frame >= rowMatchStart + ITEMS.length * 14 + 4
            ? "All 5 images matched"
            : "Drop image files anywhere in this zone"}
        </div>
      </div>

      {/* floating image stack falling into zone */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", marginLeft: 120, marginTop: -260,
        transform: `translateY(${stackY}px)`,
        opacity: stackO,
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            position: "absolute", top: i * -6, left: i * 8,
            width: 110, height: 80, background: theme.card,
            borderRadius: 6, border: `1px solid ${theme.ink}15`,
            boxShadow: "0 14px 28px -8px rgba(0,0,0,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "DM Sans", fontSize: 10, letterSpacing: "0.1em", color: theme.muted,
          }}>
            <div style={{
              position: "absolute", inset: 6, background: ["#3a3a3a", "#c7c2ba", "#1a1a1a"][i],
              borderRadius: 3,
            }} />
            <span style={{ position: "relative", zIndex: 1, color: "#fff", mixBlendMode: "difference" }}>IMG</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
