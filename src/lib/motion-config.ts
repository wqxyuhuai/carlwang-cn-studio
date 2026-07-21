export const detailMediaRevealConfig = {
  durationMs: 1100,
  maxDelayMs: 240,
  staggerMs: 55,
  triggerLeadViewportRatio: 0.24,
  triggerRootMargin: "0px 0px 24% 0px",
  triggerThreshold: 0.04
} as const;

export const smoothWheelConfig = {
  activationThresholdPx: 32,
  follow: 0.24,
  inputGain: 1.04,
  maxInputStepPx: 160,
  maxLagPx: 240,
  stopEpsilonPx: 0.35
} as const;
