import { Composition } from "remotion";
import { Clean, Final } from "./Episode";
import { EPISODES } from "./episodes";

export const RemotionRoot: React.FC = () => (
  <>
    {EPISODES.map((ep) => <Composition key={"c" + ep.n} id={`Ep${ep.n}-Clean`} component={Clean} durationInFrames={ep.tl.frames} fps={30} width={1080} height={1920} defaultProps={{ n: ep.n }} />)}
    {EPISODES.map((ep) => <Composition key={"f" + ep.n} id={`Ep${ep.n}-Final`} component={Final} durationInFrames={ep.tl.frames} fps={30} width={1080} height={1920} defaultProps={{ n: ep.n }} />)}
  </>
);
