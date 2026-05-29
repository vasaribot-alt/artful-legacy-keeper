import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import { theme } from "./theme";
import { SceneTitleExhibition } from "./scenes/SceneTitleExhibition";
import { SceneExhibitionNew } from "./scenes/SceneExhibitionNew";
import { SceneInstallationViews } from "./scenes/SceneInstallationViews";
import { SceneLinkArtworks } from "./scenes/SceneLinkArtworks";
import { SceneExhibitionText } from "./scenes/SceneExhibitionText";
import { SceneExhibitionCVSync } from "./scenes/SceneExhibitionCVSync";

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
        <span>Tutorial · 05 of 05</span>
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
        <span>Document an exhibition</span>
      </div>
    </AbsoluteFill>
  );
};

export const HowToExhibition: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperGrain />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={170}><SceneTitleExhibition /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />
        <TransitionSeries.Sequence durationInFrames={290}><SceneExhibitionNew /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 26 })} />
        <TransitionSeries.Sequence durationInFrames={280}><SceneInstallationViews /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />
        <TransitionSeries.Sequence durationInFrames={250}><SceneLinkArtworks /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 26 })} />
        <TransitionSeries.Sequence durationInFrames={250}><SceneExhibitionText /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 26 })} />
        <TransitionSeries.Sequence durationInFrames={230}><SceneExhibitionCVSync /></TransitionSeries.Sequence>
      </TransitionSeries>
      <Chrome />
    </AbsoluteFill>
  );
};
