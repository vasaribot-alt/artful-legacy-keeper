import { Composition } from "remotion";
import { HowToRegister } from "./HowToRegister";
import { HowToProfile } from "./HowToProfile";
import { HowToBulk } from "./HowToBulk";
import { HowToCapture } from "./HowToCapture";
import { HowToExhibition } from "./HowToExhibition";
import { HowToCatalogues } from "./HowToCatalogues";
import { HowToDuplicate } from "./HowToDuplicate";
import { InstagramArtist } from "./InstagramArtist";
import { InstagramCollector } from "./InstagramCollector";
import { InstagramEstate } from "./InstagramEstate";
import { InstagramGallery } from "./InstagramGallery";

export const RemotionRoot = () => (
  <>
    <Composition
      id="how-to-register"
      component={HowToRegister}
      durationInFrames={765}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="how-to-profile"
      component={HowToProfile}
      durationInFrames={1378}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="how-to-bulk"
      component={HowToBulk}
      durationInFrames={1248}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="how-to-capture"
      component={HowToCapture}
      durationInFrames={1202}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="how-to-exhibition"
      component={HowToExhibition}
      durationInFrames={1350}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="how-to-catalogues"
      component={HowToCatalogues}
      durationInFrames={1114}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="how-to-duplicate"
      component={HowToDuplicate}
      durationInFrames={944}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="instagram-artist"
      component={InstagramArtist}
      durationInFrames={540}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="instagram-collector"
      component={InstagramCollector}
      durationInFrames={705}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="instagram-estate"
      component={InstagramEstate}
      durationInFrames={765}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
