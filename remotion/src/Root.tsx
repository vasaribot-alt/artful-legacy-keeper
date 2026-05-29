import { Composition } from "remotion";
import { HowToRegister } from "./HowToRegister";
import { HowToProfile } from "./HowToProfile";
import { HowToBulk } from "./HowToBulk";

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
  </>
);
