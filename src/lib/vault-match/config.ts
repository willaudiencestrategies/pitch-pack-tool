/** Problem-led weighting (Tim's call). Must sum to 1. */
export const AXIS_WEIGHTS = { problem: 0.45, audience: 0.35, mechanism: 0.20 } as const;

/** Total-score cutoffs for confidence labels (tunable). */
export const CONFIDENCE_THRESHOLDS = { strong: 70, plausible: 45 } as const;

/** Below this top score, the Vault has no genuine comparable → recommend Creative Lab. */
export const NO_COMPARABLE_FLOOR = 35;

/** Scoring runs on Sonnet — the failure mode was weak judgement, so we don't economise here. */
export const SCORING_MODEL = 'claude-sonnet-4-6';

/** Max concepts returned to the UI. */
export const MAX_RANKED = 5;
