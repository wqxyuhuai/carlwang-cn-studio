export const detailMediaRevealConfig = {
  durationMs: 1100,
  maxDelayMs: 240,
  staggerMs: 55,
  triggerLeadViewportRatio: 0.24,
  triggerThreshold: 0.04
} as const;

export const smoothWheelConfig = {
  activationThresholdPx: 32,
  follow: 0.19,
  inputGain: 1.08,
  maxInputStepPx: 180,
  maxLagPx: 300,
  stopEpsilonPx: 0.35
} as const;
