import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import { theme } from "./theme";
import { SceneTitleProfile } from "./scenes/SceneTitleProfile";
import { SceneProfileBasics } from "./scenes/SceneProfileBasics";
import { SceneProfilePhoto } from "./scenes/SceneProfilePhoto";
import { SceneGalleries } from "./scenes/SceneGalleries";
import { SceneCV } from "./scenes/SceneCV";

loadSerif();
loadSans();

const PaperGrain = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 30]);
  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: -60,
        background: `radial-gradient(circle at 30% 20%, ${theme.bgDeep} 0%, transparent 60%), radial-gradient(circle at 80% 80%, ${theme.bgDeep} 0%, transparent 55%)`,
        transform: `translate(${drift * 0.3}px, ${-drift * 0.2}px)`,
        opacity: 0.9,
      }} />
    </AbsoluteFill>
  );
};

const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: 40, left: 60, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "DM Sans", fontSize: 18, color: theme.inkSoft, letterSpacing: "0.15em", textTransform: "uppercase",
      }}>
        <span>Global Artist Registry Foundation</span>
        <span>Tutorial · 02 of 03</span>
      </div>
      <div style={{ position: "absolute", top: 80, left: 60, right: 60, height: 1, background: `${theme.ink}15` }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: theme.ink }} />
      </div>
      <div style={{
        position: "absolute", bottom: 50, left: 60, right: 60,
        display: "flex", justifyContent: "space-between",
        fontFamily: "DM Sans", fontSize: 16, color: theme.muted, letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        <span>globalartistregistry.org</span>
        <span>Build your profile</span>
      </div>
    </AbsoluteFill>
  );
};

export const HowToProfile: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperGrain />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}><SceneTitleProfile /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />
        <TransitionSeries.Sequence durationInFrames={260}><SceneProfileBasics /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 26 })} />
        <TransitionSeries.Sequence durationInFrames={220}><SceneProfilePhoto /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />
        <TransitionSeries.Sequence durationInFrames={250}><SceneGalleries /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 26 })} />
        <TransitionSeries.Sequence durationInFrames={320}><SceneCV /></TransitionSeries.Sequence>
      </TransitionSeries>
      <Chrome />
    </AbsoluteFill>
  );
};
