import React from "react";
import { Composition } from "remotion";
import { Promo, jumlahFramePromo } from "./Promo";
import { Tutorial, jumlahFrameTutorial } from "./Tutorial";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={jumlahFramePromo()}
      fps={30}
      width={1280}
      height={720}
    />
    <Composition
      id="Tutorial"
      component={Tutorial}
      durationInFrames={jumlahFrameTutorial()}
      fps={30}
      width={1280}
      height={720}
    />
  </>
);
