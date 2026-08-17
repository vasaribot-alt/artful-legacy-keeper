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
  SERIF,
  PaperGrain,
  Eyebrow,
  BigWords,
  BodyLine,
  Chrome,
  ReelSafe,
} from "./InstagramShared";

const ImageBand = ({
  src,
  delay,
  height,
  bottom = 0,
}: {
  src: string;
  delay: number;
  height: number;
  bottom?: number;
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [delay, delay + 30], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [delay, delay + 140], [1.09, 1.0]);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom,
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

const SceneHook = () => {
  const frame = useCurrentFrame();
  const lineW = interpolate(frame, [30, 70], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: "150px 64px 0" }}>
      <Eyebrow text="Global Artist Registry Foundation" delay={4} />
      <div style={{ marginTop: 28 }}>
        <BigWords lines={["Art survives.", "Its record", "usually doesn't."]} delay={10} size={82} italicIndex={2} />
      </div>
      <div style={{ width: `${lineW * 300}px`, height: 3, background: theme.ink, marginTop: 40 }} />
      <ImageBand src="images/install2.jpg" delay={44} height={760} />
    </AbsoluteFill>
  );
};

const YearMarker = ({
  year,
  label,
  delay,
}: {
  year: string;
  label: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 24,
        opacity: s,
        transform: `translateX(${(1 - s) * -40}px)`,
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 56,
          color: theme.ink,
          letterSpacing: "-0.03em",
          minWidth: 190,
        }}
      >
        {year}
      </div>
      <div style={{ flex: 1, height: 1, background: `${theme.ink}22` }} />
      <div style={{ fontFamily: SANS, fontSize: 21, color: theme.inkSoft, maxWidth: 420 }}>{label}</div>
    </div>
  );
};

const SceneHorizon = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="The 100-year plan" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["We build for", "the century,", "not the season."]} delay={8} size={72} italicIndex={1} />
      </div>
      <div
        style={{
          marginTop: 52,
          display: "flex",
          flexDirection: "column",
          gap: 34,
        }}
      >
        <YearMarker year="2026" label="The registry opens. Artists document their own work." delay={36} />
        <YearMarker year="2076" label="Estates and heirs inherit a complete, verified record." delay={50} />
        <YearMarker year="2126" label="Scholars still read what the artist wrote themselves." delay={64} />
      </div>
      <ImageBand src="images/install6.jpg" delay={80} height={560} />
    </AbsoluteFill>
  );
};

const PillarCard = ({
  title,
  body,
  delay,
}: {
  title: string;
  body: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120 } });
  const drift = Math.sin((frame - delay) / 34) * 4;
  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.ink}18`,
        borderRadius: 12,
        padding: "26px 30px",
        opacity: s,
        transform: `translateY(${(1 - s) * 44 + drift}px)`,
        boxShadow: "0 30px 60px -30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontFamily: SERIF, fontSize: 34, color: theme.ink, letterSpacing: "-0.02em" }}>{title}</div>
      <div style={{ fontFamily: SANS, fontSize: 19, color: theme.muted, marginTop: 10, lineHeight: 1.4 }}>{body}</div>
    </div>
  );
};

const SceneWhat = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="What we do" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["One record.", "Permanent."]} delay={8} size={76} italicIndex={1} />
      </div>
      <div
        style={{
          marginTop: 48,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 840,
        }}
      >
        <PillarCard title="Identity" body="Verified artists, unique GAR and GAWID identifiers for every work." delay={34} />
        <PillarCard title="Provenance" body="Exhibitions, catalogues, editions, locations — kept in the artist's own hands." delay={48} />
        <PillarCard title="Continuity" body="Registrars, estates and committees carry the archive forward." delay={62} />
      </div>
      <ImageBand src="images/install5.jpg" delay={78} height={640} />
    </AbsoluteFill>
  );
};

const SceneNonProfit = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 34, fps, config: { damping: 15, stiffness: 120 } });
  const shift = interpolate(frame, [40, 190], [0, -140]);
  const o = interpolate(frame, [40, 68], [0, 1], { extrapolateRight: "clamp" });
  const imgs = ["images/art2.jpg", "images/cover-2.jpg", "images/install4.jpg", "images/art5.jpg"];
  return (
    <AbsoluteFill style={{ padding: "150px 64px 0" }}>
      <Eyebrow text="How it is funded" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Free for artists.", "Funded by", "those who care."]} delay={8} size={72} italicIndex={2} />
      </div>
      <BodyLine
        text="A Dutch non-profit foundation. No commission, no sales, no ownership of your work — supported by donors, galleries and institutions."
        delay={30}
        maxWidth={800}
      />
      <div
        style={{
          marginTop: 42,
          alignSelf: "flex-start",
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
        Non-profit · no commission · artist-owned data
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 120,
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
              width: 600,
              height: 840,
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
    </AbsoluteFill>
  );
};

const SceneCta = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaS = spring({ frame: frame - 22, fps, config: { damping: 16, stiffness: 140 } });
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
        <BigWords lines={["Documented", "today. Read in", "a hundred years."]} delay={8} size={78} italicIndex={2} />
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

export const InstagramMission: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperGrain />
      <ReelSafe>
      <Sequence from={0} durationInFrames={125}>
        <SceneHook />
      </Sequence>
      <Sequence from={125} durationInFrames={175}>
        <SceneHorizon />
      </Sequence>
      <Sequence from={300} durationInFrames={180}>
        <SceneWhat />
      </Sequence>
      <Sequence from={480} durationInFrames={165}>
        <SceneNonProfit />
      </Sequence>
      <Sequence from={645} durationInFrames={135}>
        <SceneCta />
      </Sequence>
      <Chrome index="05 / 05" />
    </ReelSafe>
    </AbsoluteFill>
  );
};
