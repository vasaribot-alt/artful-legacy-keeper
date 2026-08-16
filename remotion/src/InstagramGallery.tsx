import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  Img,
  Sequence,
} from "remotion";
import { theme } from "./theme";
import {
  SANS,
  PaperGrain,
  Eyebrow,
  BigWords,
  BodyLine,
  Chrome,
} from "./InstagramShared";

const SceneHook = () => {
  const frame = useCurrentFrame();
  const lineW = interpolate(frame, [26, 64], [0, 1], { extrapolateRight: "clamp" });
  const imgO = interpolate(frame, [40, 80], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(frame, [40, 150], [1.1, 1.0]);
  return (
    <AbsoluteFill style={{ padding: "150px 64px 0" }}>
      <Eyebrow text="For galleries" delay={4} />
      <div style={{ marginTop: 28 }}>
        <BigWords
          lines={["You hold the", "documentation", "of a lifetime."]}
          delay={10}
          size={78}
          italicIndex={2}
        />
      </div>
      <div style={{ width: `${lineW * 280}px`, height: 3, background: theme.ink, marginTop: 40 }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 760,
          overflow: "hidden",
          opacity: imgO,
        }}
      >
        <Img
          src={staticFile("images/install3.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${imgScale})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const BottomBand = ({
  src,
  delay,
  height,
}: {
  src: string;
  delay: number;
  height: number;
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [delay, delay + 30], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [delay, delay + 130], [1.08, 1.0]);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        overflow: "hidden",
        opacity: o,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }}
      />
    </div>
  );
};

const FileCard = ({
  label,
  sub,
  delay,
  rotate,
}: {
  label: string;
  sub: string;
  delay: number;
  rotate: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120 } });
  const drift = Math.sin((frame - delay) / 30) * 4;
  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.ink}18`,
        borderRadius: 12,
        padding: "26px 28px",
        opacity: s,
        transform: `translateY(${(1 - s) * 40 + drift}px) rotate(${rotate}deg)`,
        boxShadow: "0 30px 60px -30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontFamily: SANS, fontSize: 26, color: theme.ink, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: SANS, fontSize: 17, color: theme.muted, marginTop: 8 }}>{sub}</div>
    </div>
  );
};

const SceneRisk = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="The reality" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Records live in", "your system —", "not with the artist."]} delay={8} size={70} italicIndex={2} />
      </div>
      <BodyLine
        text="Dimensions, editions, exhibition history, installation views. Invaluable — and rarely in the artist's own hands."
        delay={30}
        maxWidth={780}
      />
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          top: 620,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <FileCard label="Inventory sheets" sub="Titles, years, media, dimensions" delay={46} rotate={-1.2} />
        <FileCard label="Exhibition files" sub="Solo and group, venues, dates" delay={58} rotate={0.8} />
        <FileCard label="Image archives" sub="Installation views, credits" delay={70} rotate={-0.6} />
      </div>
      <BottomBand src="images/install6.jpg" delay={80} height={520} />
    </AbsoluteFill>
  );
};

const AskRow = ({
  text,
  delay,
  positive,
}: {
  text: string;
  delay: number;
  positive: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 130 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "20px 24px",
        borderRadius: 12,
        background: positive ? theme.ink : theme.card,
        border: positive ? "none" : `1px solid ${theme.ink}18`,
        color: positive ? theme.bg : theme.inkSoft,
        opacity: s,
        transform: `translateX(${(1 - s) * (positive ? -30 : 30)}px)`,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 24,
          width: 30,
          textAlign: "center",
          opacity: 0.9,
        }}
      >
        {positive ? "✓" : "—"}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 22, lineHeight: 1.35 }}>{text}</div>
    </div>
  );
};

const SceneAsk = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="What we ask" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Share a copy.", "Nothing", "changes hands."]} delay={8} size={72} italicIndex={2} />
      </div>
      <div
        style={{
          marginTop: 46,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 830,
        }}
      >
        <AskRow text="Pass the documentation you hold to your artists" delay={34} positive />
        <AskRow text="Each artist builds their own archive, in their own name" delay={46} positive />
        <AskRow text="No transfer of ownership, clients or sales data" delay={58} positive={false} />
        <AskRow text="No member or contact lists requested" delay={70} positive={false} />
      </div>
      <BottomBand src="images/install5.jpg" delay={84} height={940} />
    </AbsoluteFill>
  );
};

const Strip = ({ delay }: { delay: number }) => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [delay, delay + 150], [0, -160]);
  const o = interpolate(frame, [delay, delay + 26], [0, 1], { extrapolateRight: "clamp" });
  const imgs = ["images/install1.jpg", "images/art4.jpg", "images/catalogue-cover.jpg", "images/install2.jpg"];
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 110,
        display: "flex",
        gap: 20,
        opacity: o,
        transform: `translateX(${shift}px)`,
      }}
    >
      {imgs.map((src) => (
        <div
          key={src}
          style={{
            width: 620,
            height: 860,
            flexShrink: 0,
            borderRadius: 10,
            overflow: "hidden",
            background: theme.card,
          }}
        >
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ))}
    </div>
  );
};

const SceneBenefit = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 30, fps, config: { damping: 15, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ padding: "150px 64px 0" }}>
      <Eyebrow text="Why it matters to you" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Documented work", "is easier to", "place and lend."]} delay={8} size={70} italicIndex={2} />
      </div>
      <BodyLine
        text="Verified provenance strengthens every future sale, loan and catalogue raisonné — for the artist, and for the gallery that represented them."
        delay={34}
        maxWidth={800}
      />
      <div
        style={{
          marginTop: 44,
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 14,
          padding: "16px 26px",
          borderRadius: 12,
          border: `1.5px solid ${theme.ink}`,
          fontFamily: SANS,
          fontSize: 19,
          fontWeight: 600,
          color: theme.ink,
          opacity: s,
          transform: `translateY(${(1 - s) * 22}px)`,
        }}
      >
        Free for artists · non-profit · no commission
      </div>
      <Strip delay={44} />
    </AbsoluteFill>
  );
};

const SceneCta = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaS = spring({ frame: frame - 20, fps, config: { damping: 16, stiffness: 140 } });
  return (
    <AbsoluteFill
      style={{
        padding: "220px 64px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Eyebrow text="Global Artist Registry Foundation" delay={2} />
      <div style={{ marginTop: 28 }}>
        <BigWords lines={["Become a", "supporting", "gallery."]} delay={8} size={84} italicIndex={2} />
      </div>
      <div
        style={{
          marginTop: 54,
          padding: "22px 44px",
          background: theme.ink,
          color: theme.bg,
          borderRadius: 14,
          fontFamily: SANS,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "0.02em",
          opacity: ctaS,
          transform: `translateY(${(1 - ctaS) * 30}px) scale(${0.92 + ctaS * 0.08})`,
        }}
      >
        globalartistregistry.org
      </div>
      <div
        style={{
          marginTop: 34,
          fontFamily: SANS,
          fontSize: 16,
          color: theme.muted,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Non-profit · KvK 42024490
      </div>
    </AbsoluteFill>
  );
};

export const InstagramGallery: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperGrain />
      <Sequence from={0} durationInFrames={120}>
        <SceneHook />
      </Sequence>
      <Sequence from={120} durationInFrames={165}>
        <SceneRisk />
      </Sequence>
      <Sequence from={285} durationInFrames={180}>
        <SceneAsk />
      </Sequence>
      <Sequence from={465} durationInFrames={165}>
        <SceneBenefit />
      </Sequence>
      <Sequence from={630} durationInFrames={135}>
        <SceneCta />
      </Sequence>
      <Chrome index="04 / 05" />
    </AbsoluteFill>
  );
};
