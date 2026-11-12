import { Composition } from "remotion";
import { AudioOnly, Clean, Final } from "./Episode";
import { EPISODES } from "./episodes";

export const RemotionRoot: React.FC = () => (
  <>
    {EPISODES.map((ep) => <Composition key={"c" + ep.id} id={`${ep.id}-Clean`} component={Clean} durationInFrames={ep.tl.frames} fps={30} width={1080} height={1920} defaultProps={{ id: ep.id }} />)}
    {EPISODES.map((ep) => <Composition key={"f" + ep.id} id={`${ep.id}-Final`} component={Final} durationInFrames={ep.tl.frames} fps={30} width={1080} height={1920} defaultProps={{ id: ep.id }} />)}
    {EPISODES.map((ep) => <Composition key={"a" + ep.id} id={`${ep.id}-Audio`} component={AudioOnly} durationInFrames={ep.tl.frames} fps={30} width={1080} height={1920} defaultProps={{ id: ep.id }} />)}
  </>
);
