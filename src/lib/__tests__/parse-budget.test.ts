import { describe, it, expect } from 'vitest';
import { parseUsdBudget } from '../parse-budget';

describe('parseUsdBudget', () => {
  it('parses plain comma-separated figures', () => {
    expect(parseUsdBudget('$250,000')).toBe(250_000);
    expect(parseUsdBudget('USD 500,000')).toBe(500_000);
    expect(parseUsdBudget('approx 1,200,000')).toBe(1_200_000);
  });

  it('expands k and M scale suffixes (the old parser dropped these)', () => {
    expect(parseUsdBudget('250k')).toBe(250_000);
    expect(parseUsdBudget('$200k p/e')).toBe(200_000);
    expect(parseUsdBudget('£250k')).toBe(250_000);
    expect(parseUsdBudget('$1.5M')).toBe(1_500_000);
    expect(parseUsdBudget('$2 million')).toBe(2_000_000);
  });

  it('takes the lower bound of a range and inherits a shared scale', () => {
    expect(parseUsdBudget('Production: $80k-$120k')).toBe(80_000);
    expect(parseUsdBudget('$150k–$200k p/e')).toBe(150_000);
    expect(parseUsdBudget('$80-120k')).toBe(80_000); // scale stated once
  });

  it('prefers currency-anchored numbers over stray ones like a year', () => {
    expect(parseUsdBudget('2026 campaign, budget $300,000')).toBe(300_000);
  });

  it('returns null when there is no usable figure', () => {
    expect(parseUsdBudget('TBC')).toBeNull();
    expect(parseUsdBudget('')).toBeNull();
    expect(parseUsdBudget(null)).toBeNull();
    expect(parseUsdBudget(undefined)).toBeNull();
  });
});
