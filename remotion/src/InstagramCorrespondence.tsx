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
      <Eyebrow text="Correspondence Archive" delay={4} />
      <div style={{ marginTop: 28 }}>
        <BigWords lines={["Your inbox", "holds art", "history."]} delay={10} size={84} italicIndex={2} />
      </div>
      <div style={{ width: `${lineW * 300}px`, height: 3, background: theme.ink, marginTop: 40 }} />
      <BodyLine
        text="The emails, offers, invitations and negotiations around a work are as valuable as the work itself."
        delay={34}
        maxWidth={780}
      />
      <ImageBand src="images/install2.jpg" delay={54} height={720} />
    </AbsoluteFill>
  );
};

const FilePill = ({
  ext,
  label,
  delay,
  x,
  y,
}: {
  ext: string;
  label: string;
  delay: number;
  x: number;
  y: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        background: theme.card,
        border: `1.5px solid ${theme.ink}`,
        borderRadius: 14,
        padding: "22px 30px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity: s,
        transform: `translateY(${(1 - s) * 40}px) scale(${0.92 + s * 0.08})`,
        boxShadow: "0 30px 60px -25px rgba(0,0,0,0.22)",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "6px 10px",
          background: theme.ink,
          color: theme.bg,
          borderRadius: 6,
        }}
      >
        {ext}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 24, color: theme.ink, fontWeight: 600 }}>{label}</div>
    </div>
  );
};

const SceneUpload = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="How it works" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Upload your", "emails as", "you received them."]} delay={8} size={72} italicIndex={2} />
      </div>
      <BodyLine
        text="Drag in .eml files, an .mbox export, or a zip of saved correspondence. We parse the senders, dates, subjects and bodies."
        delay={30}
        maxWidth={800}
      />
      <FilePill ext=".eml" label="Saved messages" delay={46} x={64} y={540} />
      <FilePill ext=".mbox" label="Full inbox export" delay={58} x={64} y={640} />
      <FilePill ext=".zip" label="Bulk deposits" delay={70} x={64} y={740} />
      <ImageBand src="images/install5.jpg" delay={80} height={560} />
    </AbsoluteFill>
  );
};

const MockEmailRow = ({
  from,
  subject,
  date,
  delay,
  active,
}: {
  from: string;
  subject: string;
  date: string;
  delay: number;
  active?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 130 } });
  return (
    <div
      style={{
        padding: "22px 26px",
        borderRadius: 12,
        background: active ? theme.ink : theme.card,
        border: `1px solid ${theme.ink}15`,
        opacity: s,
        transform: `translateX(${(1 - s) * 40}px)`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 600, color: active ? theme.bg : theme.ink }}>
          {from}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 15, color: active ? theme.bgDeep : theme.muted }}>{date}</div>
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 24,
          color: active ? theme.bg : theme.inkSoft,
          marginTop: 8,
          letterSpacing: "-0.01em",
        }}
      >
        {subject}
      </div>
    </div>
  );
};

const SceneSearch = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const searchS = spring({ frame: frame - 28, fps, config: { damping: 20, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="Once inside" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Searchable.", "Linkable.", "Permanent."]} delay={8} size={74} italicIndex={2} />
      </div>
      <div
        style={{
          marginTop: 42,
          padding: "16px 24px",
          borderRadius: 12,
          background: theme.card,
          border: `1px solid ${theme.ink}15`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: searchS,
          transform: `translateY(${(1 - searchS) * 20}px)`,
        }}
      >
        <div style={{ fontFamily: SANS, fontSize: 22, color: theme.muted }}>🔎</div>
        <div style={{ fontFamily: SANS, fontSize: 20, color: theme.inkSoft }}>“GAWID-100847”</div>
      </div>
      <div
        style={{
          marginTop: 22,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <MockEmailRow from="Pace Gallery" subject="Re: availability for the group show" date="2024-03-12" delay={46} />
        <MockEmailRow
          from="Studio of the artist"
          subject="Shipping dimensions confirmed"
          date="2024-02-28"
          delay={56}
          active
        />
        <MockEmailRow from="Collector" subject="Loan request — Venice Biennale 2025" date="2024-01-09" delay={66} />
      </div>
      <ImageBand src="images/install4.jpg" delay={80} height={520} />
    </AbsoluteFill>
  );
};

const StatCard = ({
  num,
  label,
  delay,
}: {
  num: string;
  label: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120 } });
  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.ink}18`,
        borderRadius: 12,
        padding: "28px 30px",
        opacity: s,
        transform: `translateY(${(1 - s) * 44}px)`,
        boxShadow: "0 30px 60px -30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontFamily: SERIF, fontSize: 52, color: theme.ink, letterSpacing: "-0.03em" }}>{num}</div>
      <div style={{ fontFamily: SANS, fontSize: 18, color: theme.muted, marginTop: 8, lineHeight: 1.4 }}>{label}</div>
    </div>
  );
};

const SceneWhy = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="Why preserve it" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Context is", "provenance", "too."]} delay={8} size={78} italicIndex={1} />
      </div>
      <BodyLine
        text="For artists, estates and future scholars, the story around a work matters as much as the object. Correspondence is evidence."
        delay={30}
        maxWidth={800}
      />
      <div
        style={{
          marginTop: 48,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <StatCard num="100" label="Years of preservation" delay={46} />
        <StatCard num="Full-text" label="Search across every message" delay={56} />
        <StatCard num="Auto-link" label="Matches artworks & exhibitions" delay={66} />
        <StatCard num="Private" label="Yours. Not mined or sold." delay={76} />
      </div>
      <ImageBand src="images/install6.jpg" delay={80} height={640} />
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
        <BigWords lines={["Archive the", "conversation", "behind the art."]} delay={8} size={78} italicIndex={2} />
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

export const InstagramCorrespondence: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperGrain />
      <ReelSafe>
        <Sequence from={0} durationInFrames={125}>
          <SceneHook />
        </Sequence>
        <Sequence from={125} durationInFrames={175}>
          <SceneUpload />
        </Sequence>
        <Sequence from={300} durationInFrames={180}>
          <SceneSearch />
        </Sequence>
        <Sequence from={480} durationInFrames={165}>
          <SceneWhy />
        </Sequence>
        <Sequence from={645} durationInFrames={135}>
          <SceneCta />
        </Sequence>
        <Chrome index="06 / 06" />
      </ReelSafe>
    </AbsoluteFill>
  );
};
