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
} from "./InstagramShared";

/* ---------------- Scene 1 — Hook ---------------- */

const SceneHook = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [22, 58], [0, 0.55], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [22, 130], [1.12, 1.0]);
  const lineW = interpolate(frame, [40, 80], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: o }}>
        <Img
          src={staticFile("images/install6.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
            filter: "grayscale(1) contrast(1.05)",
          }}
        />
      </div>
      <AbsoluteFill style={{ padding: "170px 64px 0" }}>
        <Eyebrow text="For estates & heirs" delay={4} />
        <div style={{ marginTop: 28 }}>
          <BigWords
            lines={["An artist's work", "outlives the", "artist."]}
            delay={10}
            size={82}
            italicIndex={2}
          />
        </div>
        <div
          style={{ width: `${lineW * 300}px`, height: 3, background: theme.ink, marginTop: 44 }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- Scene 2 — The loss ---------------- */

const DecayCard = ({
  src,
  delay,
  label,
  rotate,
}: {
  src: string;
  delay: number;
  label: string;
  rotate: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 100 } });
  const fade = interpolate(frame, [delay + 40, delay + 110], [1, 0.34], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity: s * fade,
        transform: `translateY(${(1 - s) * 40}px) rotate(${rotate}deg)`,
        background: theme.card,
        border: `1px solid ${theme.ink}16`,
        padding: 14,
        boxShadow: "0 30px 60px -30px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ height: 250, overflow: "hidden", background: `${theme.ink}08` }}>
        <Img
          src={staticFile(src)}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.6)" }}
        />
      </div>
      <div
        style={{
          marginTop: 12,
          fontFamily: SANS,
          fontSize: 14,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: theme.muted,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const SceneLoss = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="What usually happens" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Boxes. Slides.", "Loose notes.", "Then silence."]} delay={8} size={74} />
      </div>
      <BodyLine
        text="Titles, dates, dimensions and exhibition history disappear with the people who remembered them."
        delay={30}
        maxWidth={780}
      />
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 620,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 30,
        }}
      >
        <DecayCard src="images/art3.jpg" delay={46} label="Untitled, undated" rotate={-2.5} />
        <DecayCard src="images/install3.jpg" delay={58} label="Photographer unknown" rotate={2} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Scene 3 — The archive ---------------- */

const LedgerRow = ({
  field,
  value,
  delay,
}: {
  field: string;
  value: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140 } });
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 20,
        padding: "16px 0",
        borderBottom: `1px solid ${theme.ink}14`,
        opacity: s,
        transform: `translateX(${(1 - s) * -24}px)`,
      }}
    >
      <span
        style={{
          fontFamily: SANS,
          fontSize: 14,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: theme.muted,
        }}
      >
        {field}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: 26, color: theme.ink }}>{value}</span>
    </div>
  );
};

const SceneArchive = () => {
  const frame = useCurrentFrame();
  const imgO = interpolate(frame, [56, 84], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(frame, [56, 165], [1.06, 1.0]);
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="Catalogue Raisonné infrastructure" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords
          lines={["Every work,", "documented", "to scholarly standard."]}
          delay={8}
          size={64}
          italicIndex={2}
        />
      </div>
      <div style={{ marginTop: 32 }} />
      <div style={{ marginTop: 8, maxWidth: 860 }}>
        <LedgerRow field="GAWID" value="GAWID-10024187" delay={34} />
        <LedgerRow field="Medium" value="Oil on linen" delay={44} />
        <LedgerRow field="Dimensions" value="180 × 140 cm" delay={54} />
        <LedgerRow field="Provenance" value="3 recorded owners" delay={64} />
        <LedgerRow field="Exhibitions" value="7 linked records" delay={74} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 800,
          overflow: "hidden",
          opacity: imgO,
        }}
      >
        <Img
          src={staticFile("images/art5.jpg")}
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

/* ---------------- Scene 4 — Stewardship ---------------- */

const StepChip = ({ text, delay }: { text: string; delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 150 } });
  return (
    <div
      style={{
        padding: "16px 26px",
        border: `1px solid ${theme.ink}22`,
        borderRadius: 999,
        background: theme.card,
        fontFamily: SANS,
        fontSize: 21,
        color: theme.ink,
        opacity: s,
        transform: `translateY(${(1 - s) * 24}px)`,
      }}
    >
      {text}
    </div>
  );
};

const StewardBand = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [70, 100], [0, 1], { extrapolateRight: "clamp" });
  const x = interpolate(frame, [70, 165], [-40, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 470,
        height: 500,
        overflow: "hidden",
        opacity: o,
      }}
    >
      <Img
        src={staticFile("images/install5.jpg")}
        style={{
          width: "110%",
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${x}px)`,
        }}
      />
    </div>
  );
};

const SceneStewardship = () => {
  const frame = useCurrentFrame();
  const years = Math.round(
    interpolate(frame, [26, 96], [0, 100], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
  );
  return (
    <AbsoluteFill style={{ padding: "150px 64px 0" }}>
      <Eyebrow text="Continuity" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Held, verified,", "and handed on."]} delay={8} size={76} italicIndex={1} />
      </div>
      <BodyLine
        text="Estates can appoint registrars, approve records, and keep authority over what the world sees."
        delay={30}
        maxWidth={780}
      />
      <div
        style={{
          marginTop: 46,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          maxWidth: 860,
        }}
      >
        <StepChip text="Appoint a registrar" delay={44} />
        <StepChip text="Approve each record" delay={54} />
        <StepChip text="Control public visibility" delay={64} />
      </div>
      <StewardBand />
      <div
        style={{
          position: "absolute",
          left: 64,
          bottom: 190,
          fontFamily: SERIF,
          fontSize: 210,
          lineHeight: 0.85,
          color: theme.ink,
          letterSpacing: "-0.05em",
        }}
      >
        {years}
        <span style={{ fontFamily: SANS, fontSize: 26, letterSpacing: "0.2em", marginLeft: 18 }}>
          YEAR PLAN
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Scene 5 — CTA ---------------- */

const SceneCta = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaS = spring({ frame: frame - 20, fps, config: { damping: 16, stiffness: 140 } });
  return (
    <AbsoluteFill
      style={{
        padding: "230px 64px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Eyebrow text="Global Artist Registry Foundation" delay={2} />
      <div style={{ marginTop: 28 }}>
        <BigWords lines={["Secure the", "legacy while", "it is still here."]} delay={8} size={76} italicIndex={2} />
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

export const InstagramEstate: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperGrain />
      <Sequence from={0} durationInFrames={120}>
        <SceneHook />
      </Sequence>
      <Sequence from={120} durationInFrames={165}>
        <SceneLoss />
      </Sequence>
      <Sequence from={285} durationInFrames={180}>
        <SceneArchive />
      </Sequence>
      <Sequence from={465} durationInFrames={165}>
        <SceneStewardship />
      </Sequence>
      <Sequence from={630} durationInFrames={135}>
        <SceneCta />
      </Sequence>
      <Chrome index="03 / 05" />
    </AbsoluteFill>
  );
};
