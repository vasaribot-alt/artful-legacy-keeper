import { AbsoluteFill } from "remotion";
import React from "react";

// Pulls all video content inward so nothing important touches the bleed/overscan edge
// when shown fullscreen on TVs, projectors, or cropped players.
export const SafeArea: React.FC<{ children: React.ReactNode; scale?: number }> = ({
  children,
  scale = 0.88,
}) => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
