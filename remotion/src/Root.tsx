import { Composition } from "remotion";
import { HowToRegister } from "./HowToRegister";

export const RemotionRoot = () => (
  <Composition
    id="how-to-register"
    component={HowToRegister}
    durationInFrames={510}
    fps={30}
    width={1920}
    height={1080}
  />
);
