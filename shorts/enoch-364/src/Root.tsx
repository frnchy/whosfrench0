import { Composition, Still } from "remotion";
import { Video } from "./Video";
import sim from "./sim.json";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Final" component={Video} durationInFrames={sim.frames} fps={30} width={1080} height={1920} defaultProps={{ showText: true }} />
    <Composition id="Clean" component={Video} durationInFrames={sim.frames} fps={30} width={1080} height={1920} defaultProps={{ showText: false }} />
    <Still id="Thumbnail" component={Video} width={1080} height={1920} defaultProps={{ showText: true }} />
  </>
);
