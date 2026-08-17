import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import { theme } from "./theme";

loadSerif();
loadSans();

export const SERIF = "DM Serif Display, serif";
export const SANS = "DM Sans, sans-serif";

export const PaperGrain: React.FC = () => {
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

export const Eyebrow = ({ text, delay = 0 }: { text: string; delay?: number }) => {
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

export const BigWords = ({
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

export const BodyLine = ({
  text,
  delay = 0,
  maxWidth = 720,
}: {
  text: string;
  delay?: number;
  maxWidth?: number;
}) => {
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
        maxWidth,
        marginTop: 28,
        opacity: o,
        transform: `translateY(${y}px)`,
      }}
    >
      {text}
    </div>
  );
};

export const PhoneFrame = ({
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

export const Chrome = ({ index }: { index: string }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
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
        <span>{index}</span>
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
            width: `${(frame / durationInFrames) * 100}%`,
            background: theme.ink,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// Keeps every reel's content inside Instagram's safe zone: the 4:5 grid crop
// (top/bottom trimmed on profile grids) and the Reels UI overlays.
export const ReelSafe: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>
    <AbsoluteFill
      style={{
        transform: "scale(0.8) translateY(-40px)",
        transformOrigin: "center center",
      }}
    >
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);
