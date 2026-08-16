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
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import { theme } from "./theme";

loadSerif();
loadSans();

const SERIF = "DM Serif Display, serif";
const SANS = "DM Sans, sans-serif";

const PaperGrain = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 30]);
  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -80,
          background: `radial-gradient(circle at 25% 25%, ${theme.bgDeep} 0%, transparent 55%), radial-gradient(circle at 85% 75%, ${theme.bgDeep} 0%, transparent 55%)`,
          transform: `translate(${drift * 0.25}px, ${-drift * 0.18}px)`,
          opacity: 0.9,
        }}
      />
    </AbsoluteFill>
  );
};

const Eyebrow = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [delay, delay + 12], [8, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        fontFamily: SANS,
        fontSize: 13,
        letterSpacing: "0.35em",
        textTransform: "uppercase",
        color: theme.muted,
        opacity: o,
        transform: `translateY(${y}px)`,
      }}
    >
      {text}
    </div>
  );
};

const BigWords = ({
  lines,
  delay = 0,
  size = 84,
  italicIndex,
}: {
  lines: string[];
  delay?: number;
  size?: number;
  italicIndex?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 90 } });
  const y = interpolate(s, [0, 1], [45, 0]);
  return (
    <div
      style={{
        fontFamily: SERIF,
        fontSize: size,
        lineHeight: 0.95,
        color: theme.ink,
        letterSpacing: "-0.03em",
        transform: `translateY(${y}px) scale(${0.94 + s * 0.06})`,
        transformOrigin: "left top",
        opacity: s,
      }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ fontStyle: i === italicIndex ? "italic" : "normal" }}>
          {line}
        </div>
      ))}
    </div>
  );
};

const BodyLine = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [delay, delay + 16], [14, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        fontFamily: SANS,
        fontSize: 24,
        lineHeight: 1.45,
        color: theme.inkSoft,
        maxWidth: 720,
        marginTop: 28,
        opacity: o,
        transform: `translateY(${y}px)`,
      }}
    >
      {text}
    </div>
  );
};

const PhoneFrame = ({
  children,
  delay = 0,
  rotate = 0,
  translateY = 0,
}: {
  children: React.ReactNode;
  delay?: number;
  rotate?: number;
  translateY?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 80 } });
  const y = interpolate(s, [0, 1], [120, 0]);
  return (
    <div
      style={{
        width: 320,
        height: 660,
        borderRadius: 42,
        background: theme.ink,
        padding: 12,
        transform: `translateY(${translateY + y}px) rotate(${rotate}deg) scale(${0.92 + s * 0.08})`,
        opacity: s,
        boxShadow: "0 50px 90px -20px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 30,
          overflow: "hidden",
          background: theme.bg,
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 90,
            height: 22,
            background: theme.ink,
            borderRadius: 12,
            zIndex: 50,
          }}
        />
        {children}
      </div>
    </div>
  );
};

const SceneHook = () => {
  const frame = useCurrentFrame();
  const lineW = interpolate(frame, [24, 60], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: "160px 64px 0" }}>
      <Eyebrow text="For artists" delay={4} />
      <div style={{ marginTop: 28 }}>
        <BigWords lines={["Your artwork", "deserves more", "than a hard drive."]} delay={10} size={82} italicIndex={2} />
      </div>
      <div style={{ width: `${lineW * 260}px`, height: 3, background: theme.ink, marginTop: 40 }} />
    </AbsoluteFill>
  );
};

const SceneProblem = () => {
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="The problem" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["Galleries close.", "Clouds change.", "Records disappear."]} delay={8} size={78} />
      </div>
      <BodyLine text="Without a single verified archive, the story of your work can fragment — or vanish entirely." delay={30} />
      <div style={{ position: "absolute", right: -30, bottom: 140, opacity: 0.35 }}>
        <PhoneFrame delay={40} rotate={8} translateY={60}>
          <div style={{ paddingTop: 48, padding: "48px 14px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 140, borderRadius: 10, background: theme.card, border: `1px solid ${theme.ink}12`, overflow: "hidden" }}>
              <Img src={staticFile("images/art1.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} />
            </div>
            <div style={{ height: 18, borderRadius: 4, background: `${theme.ink}08`, width: "70%" }} />
            <div style={{ height: 14, borderRadius: 4, background: `${theme.ink}08`, width: "45%" }} />
            <div style={{ marginTop: "auto", height: 40, borderRadius: 8, background: theme.ink, display: "flex", alignItems: "center", justifyContent: "center", color: theme.bg, fontFamily: SANS, fontSize: 13, fontWeight: 600 }}>
              Upload now
            </div>
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};

const SceneSolution = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badgeS = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ padding: "140px 64px 0" }}>
      <Eyebrow text="The solution" delay={2} />
      <div style={{ marginTop: 24 }}>
        <BigWords lines={["One verified", "record.", "A permanent ID.", "100 years."]} delay={8} size={76} italicIndex={3} />
      </div>
      <div
        style={{
          marginTop: 44,
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 24px",
          border: `1px solid ${theme.ink}20`,
          borderRadius: 12,
          background: theme.card,
          opacity: badgeS,
          transform: `translateY(${(1 - badgeS) * 20}px) scale(${0.96 + badgeS * 0.04})`,
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: theme.ink }} />
        <div style={{ fontFamily: SANS, fontSize: 18, color: theme.inkSoft, letterSpacing: "0.04em" }}>
          GAR-XXXXXXXX · verified in the registry
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneCta = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaS = spring({ frame: frame - 20, fps, config: { damping: 16, stiffness: 140 } });
  return (
    <AbsoluteFill style={{ padding: "220px 64px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <Eyebrow text="Global Artist Registry Foundation" delay={2} />
      <div style={{ marginTop: 28 }}>
        <BigWords lines={["Register free.", "Preserve your", "legacy."]} delay={8} size={86} italicIndex={2} />
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
      <div style={{ marginTop: 34, fontFamily: SANS, fontSize: 16, color: theme.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Non-profit · KvK 42024490
      </div>
    </AbsoluteFill>
  );
};

export const InstagramArtist: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill>
      <PaperGrain />
      {/* Scene 1: 0-90 frames (0-3s) */}
      <Sequence from={0} durationInFrames={90}>
        <SceneHook />
      </Sequence>
      {/* Scene 2: 90-210 frames (3-7s) */}
      <Sequence from={90} durationInFrames={120}>
        <SceneProblem />
      </Sequence>
      {/* Scene 3: 210-330 frames (7-11s) */}
      <Sequence from={210} durationInFrames={120}>
        <SceneSolution />
      </Sequence>
      {/* Scene 4: 330-450 frames (11-15s) */}
      <Sequence from={330} durationInFrames={120}>
        <SceneCta />
      </Sequence>
      {/* Global chrome */}
      <AbsoluteFill style={{ pointerEvents: "none", padding: "44px 44px 50px" }}>
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 44,
            right: 44,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: SANS,
            fontSize: 13,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: theme.muted,
          }}
        >
          <span>GARF</span>
          <span>01 / 05</span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 44,
            right: 44,
            height: 2,
            background: `${theme.ink}12`,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(useCurrentFrame() / durationInFrames) * 100}%`,
              background: theme.ink,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
