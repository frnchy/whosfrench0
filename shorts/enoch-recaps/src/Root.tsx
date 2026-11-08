import { Composition } from "remotion";
import { Clean, Final } from "./Video";
import sim from "./sim.json";

export const RemotionRoot: React.FC = () => (
  <>
    {sim.episodes.map((e) => (
      <Composition key={`c${e.n}`} id={`Clean-${e.n}`} component={Clean} durationInFrames={e.frames} fps={30} width={1080} height={1920} defaultProps={{ n: e.n }} />
    ))}
    {sim.episodes.map((e) => (
      <Composition key={`f${e.n}`} id={`Final-${e.n}`} component={Final} durationInFrames={e.frames} fps={30} width={1080} height={1920} defaultProps={{ n: e.n }} />
    ))}
  </>
);
