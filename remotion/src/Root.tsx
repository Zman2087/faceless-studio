import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { Spec } from "./types";

// Kept asset-free: render.mjs inputProps are merged over these, so any key here leaks into every render.
const DEFAULT_PROPS = { duration: 4, shots: [{ at: 0, type: "title", text: "Open a spec with render.mjs", highlight: "render.mjs" }] } as unknown as Spec;

export const Root: React.FC = () => (
  <Composition
    id="Video"
    component={Video as any}
    defaultProps={DEFAULT_PROPS}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={300}
    calculateMetadata={({ props }) => {
      const p = props as unknown as Spec;
      const fps = p.fps ?? 30;
      return { fps, width: p.width ?? 1080, height: p.height ?? 1920, durationInFrames: Math.max(1, Math.round(p.duration * fps)) };
    }}
  />
);
