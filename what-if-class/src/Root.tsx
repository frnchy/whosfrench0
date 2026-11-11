import { Composition, Still } from 'remotion';
import { WhatIfVideo } from './Video';
import { FPS, TL } from './world';

const D = Math.round(TL.length * FPS);
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="WhatIf" component={WhatIfVideo} durationInFrames={D} fps={FPS} width={1080} height={1920} defaultProps={{ clean: false }} />
    <Composition id="WhatIfClean" component={WhatIfVideo} durationInFrames={D} fps={FPS} width={1080} height={1920} defaultProps={{ clean: true }} />
    {/* thumbnail: the ascension with the two-line title */}
    <Still id="Thumbnail" component={WhatIfVideo} width={1080} height={1920} defaultProps={{ clean: false, still: TL.lines[20].start + 1.2, title: true }} />
  </>
);
