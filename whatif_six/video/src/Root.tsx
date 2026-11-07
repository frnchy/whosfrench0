import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {FPS, NF} from './time';

export const Root: React.FC = () => (
  <Composition id="WhatIfSix" component={Video} durationInFrames={NF} fps={FPS} width={1080} height={1920} />
);
