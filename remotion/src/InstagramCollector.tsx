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
  PhoneFrame,
  Chrome,
} from "./InstagramShared";

const SceneHook = () => {
  const frame = useCurrentFrame();
  const lineW = interpolate(frame, [24, 60], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: "160px 64px 0" }}>
      <Eyebrow text="For collectors" delay={4} />
      <div style={{ marginTop: 28 }}>
        <BigWords
          lines={["You know what", "you own.", "Will anyone else?"]}
          delay={10}
          size={80}
          italicIndex={2}
        />
      </div>
      <div style={{ width: `${lineW * 260}px`, height: 3, background: theme.ink, marginTop: 40 }} />
    </AbsoluteFill>
  );
};

const GridTile = ({
  src,
  delay,
  label,
}: {
  src: string;
  delay: number;
  label: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 110 } });
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${(1 - s) * 34}px) scale(${0.95 + s * 0.05})`,
        background: theme.card,
        border: `1px solid ${theme.ink}14`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 300, overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div
        style={{
          padding: "12px 14px 16px",
          fontFamily: SANS,
          fontSize: 15,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: theme.muted,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const SceneProblem = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="The risk" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Invoices fade.", "Provenance", "goes missing."]} delay={8} size={76} />
      </div>
      <BodyLine
        text="Value lives in documentation. Without it, a collection becomes a room full of unattributed objects."
        delay={30}
      />
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 760,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 22,
        }}
      >
        <GridTile src="images/artwork-bold.jpg" delay={44} label="No provenance" />
        <GridTile src="images/install2.jpg" delay={54} label="No condition" />
      </div>
    </AbsoluteFill>
  );
};

const Row = ({ text, delay }: { text: string; delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 130 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "18px 24px",
        border: `1px solid ${theme.ink}18`,
        borderRadius: 12,
        background: theme.card,
        opacity: s,
        transform: `translateX(${(1 - s) * -28}px)`,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: theme.ink }} />
      <div style={{ fontFamily: SANS, fontSize: 22, color: theme.inkSoft }}>{text}</div>
    </div>
  );
};

const SceneSolution = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="Collection management" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Provenance,", "value, location —", "in one archive."]} delay={8} size={70} italicIndex={2} />
      </div>
      <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 16, maxWidth: 700 }}>
        <Row text="Purchase price, valuations, insurance value" delay={34} />
        <Row text="Where each work hangs — room by room" delay={46} />
        <Row text="Condition reports and loan history" delay={58} />
      </div>
      <div style={{ position: "absolute", right: -40, bottom: 120, opacity: 0.5 }}>
        <PhoneFrame delay={62} rotate={7} translateY={70}>
          <div style={{ padding: "48px 14px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 150, borderRadius: 10, overflow: "hidden", background: theme.card }}>
              <Img src={staticFile("images/artwork-bold.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ height: 16, borderRadius: 4, background: `${theme.ink}10`, width: "72%" }} />
            <div style={{ height: 12, borderRadius: 4, background: `${theme.ink}0c`, width: "48%" }} />
            <div style={{ height: 12, borderRadius: 4, background: `${theme.ink}0c`, width: "60%" }} />
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};

const SceneLend = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 26, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ padding: "150px 64px 0" }}>
      <Eyebrow text="And beyond your walls" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Museums can ask", "to borrow —", "privately."]} delay={8} size={72} italicIndex={2} />
      </div>
      <BodyLine
        text="Mark a work as available for loan. Institutions reach you through the registry, never through your address book."
        delay={32}
        maxWidth={760}
      />
      <div
        style={{
          marginTop: 48,
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 14,
          padding: "16px 26px",
          borderRadius: 12,
          background: theme.ink,
          color: theme.bg,
          fontFamily: SANS,
          fontSize: 19,
          fontWeight: 600,
          opacity: s,
          transform: `translateY(${(1 - s) * 22}px)`,
        }}
      >
        Willing to lend · enabled
      </div>
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
        <BigWords lines={["Document now.", "Protect the", "value."]} delay={8} size={84} italicIndex={2} />
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

export const InstagramCollector: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperGrain />
      <Sequence from={0} durationInFrames={105}>
        <SceneHook />
      </Sequence>
      <Sequence from={105} durationInFrames={150}>
        <SceneProblem />
      </Sequence>
      <Sequence from={255} durationInFrames={165}>
        <SceneSolution />
      </Sequence>
      <Sequence from={420} durationInFrames={150}>
        <SceneLend />
      </Sequence>
      <Sequence from={570} durationInFrames={135}>
        <SceneCta />
      </Sequence>
      <Chrome index="02 / 05" />
    </AbsoluteFill>
  );
};
