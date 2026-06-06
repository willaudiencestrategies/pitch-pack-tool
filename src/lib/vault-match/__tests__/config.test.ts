import { describe, it, expect } from 'vitest';
import { AXIS_WEIGHTS, CONFIDENCE_THRESHOLDS, NO_COMPARABLE_FLOOR } from '../config';

describe('vault-match config', () => {
  it('axis weights sum to 1', () => {
    const sum = AXIS_WEIGHTS.problem + AXIS_WEIGHTS.audience + AXIS_WEIGHTS.mechanism;
    expect(sum).toBeCloseTo(1, 5);
  });
  it('thresholds are ordered: floor < plausible < strong', () => {
    expect(NO_COMPARABLE_FLOOR).toBeLessThan(CONFIDENCE_THRESHOLDS.plausible);
    expect(CONFIDENCE_THRESHOLDS.plausible).toBeLessThan(CONFIDENCE_THRESHOLDS.strong);
  });
});
