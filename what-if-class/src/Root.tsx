import { Composition, Still } from 'remotion';
import { WhatIfVideo } from './Video';
import { FPS, TL } from './world';
import { LEN, THUMB_T } from './bibi';
import * as H from './homegirl';

const D = Math.round(TL.length * FPS);
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="WhatIf" component={WhatIfVideo} durationInFrames={D} fps={FPS} width={1080} height={1920} defaultProps={{ clean: false }} />
    <Composition id="WhatIfClean" component={WhatIfVideo} durationInFrames={D} fps={FPS} width={1080} height={1920} defaultProps={{ clean: true }} />
    {/* thumbnail: the ascension with the two-line title */}
    <Still id="Thumbnail" component={WhatIfVideo} width={1080} height={1920} defaultProps={{ clean: false, still: TL.lines[20].start + 1.2, title: true }} />
    <Composition id="Bibi" component={WhatIfVideo} durationInFrames={LEN * FPS} fps={FPS} width={1080} height={1920} defaultProps={{ ep: 'bibi' as const }} />
    <Still id="BibiThumbnail" component={WhatIfVideo} width={1080} height={1920} defaultProps={{ ep: 'bibi' as const, still: THUMB_T, title: true }} />
    <Composition id="Homegirl" component={WhatIfVideo} durationInFrames={H.LEN * FPS} fps={FPS} width={1080} height={1920} defaultProps={{ ep: 'homegirl' as const }} />
    <Still id="HomegirlThumbnail" component={WhatIfVideo} width={1080} height={1920} defaultProps={{ ep: 'homegirl' as const, still: H.THUMB_T, title: true }} />
  </>
);
