import { Composition } from "remotion";
import { HowToRegister } from "./HowToRegister";
import { HowToProfile } from "./HowToProfile";

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
      durationInFrames={1104}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
