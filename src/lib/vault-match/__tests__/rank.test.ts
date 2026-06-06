import { describe, it, expect } from 'vitest';
import { weightedTotal, confidenceBand, buildTopLineNote, rankAndLabel } from '../rank';
import type { AxisScores, ScoredConcept } from '../types';
import type { VaultCandidate } from '../../vault-filter';
import type { VaultConcept } from '../../types';

const axes = (p: number, a: number, m: number): AxisScores => ({
  problemScore: p, audienceScore: a, mechanismScore: m,
  problemReason: 'pr', audienceReason: 'ar', mechanismReason: 'mr',
});

const concept = (id: string): VaultConcept => ({
  id, name: `Concept ${id}`, conceptType: 'one-off', category: 'destination', archetype: [],
  ideaSummary: `idea ${id}`, creativeMechanism: '', coreMessage: '', whatItsGoodFor: [],
  audienceFit: [], channelsFormats: [], watchouts: [], previouslyPitchedTo: [],
  productionTimelineRaw: '10 weeks', productionTimeline: { minWeeks: 10, maxWeeks: 10 },
  productionBudgetRaw: '$100k', productionBudget: [{ label: 's', minUsd: 100000, maxUsd: 100000 }],
  referenceLinks: [], lastValidated: null, eraTags: [],
});

const candidate = (id: string): VaultCandidate => ({
  concept: concept(id), budgetFlag: 'within-range', partnerTypeMatch: 'same-category',
});

describe('weightedTotal', () => {
  it('applies the problem-led weights', () => {
    expect(weightedTotal(axes(100, 0, 0))).toBeCloseTo(45, 5);
    expect(weightedTotal(axes(0, 100, 0))).toBeCloseTo(35, 5);
    expect(weightedTotal(axes(0, 0, 100))).toBeCloseTo(20, 5);
    expect(weightedTotal(axes(100, 100, 100))).toBeCloseTo(100, 5);
  });
});

describe('confidenceBand', () => {
  it('maps totals to bands', () => {
    expect(confidenceBand(85)).toBe('strong');
    expect(confidenceBand(70)).toBe('strong');
    expect(confidenceBand(55)).toBe('plausible');
    expect(confidenceBand(45)).toBe('plausible');
    expect(confidenceBand(30)).toBe('stretch');
  });
});

describe('buildTopLineNote', () => {
  it('is null when the top match is plausible or better', () => {
    expect(buildTopLineNote(60)).toBeNull();
  });
  it('recommends Creative Lab when the best match is only a stretch', () => {
    expect(buildTopLineNote(40)).toContain('Creative Lab');
  });
});

describe('rankAndLabel', () => {
  it('sorts by total, assigns slots A.. and caps at 5', () => {
    const scored: ScoredConcept[] = [
      { conceptId: 'low', scores: axes(40, 40, 40) },
      { conceptId: 'high', scores: axes(90, 90, 90) },
      { conceptId: 'mid', scores: axes(70, 60, 60) },
    ];
    const byId = new Map([['low', candidate('low')], ['high', candidate('high')], ['mid', candidate('mid')]]);
    const res = rankAndLabel(scored, byId);
    expect(res.rankedConcepts.map(c => c.conceptId)).toEqual(['high', 'mid', 'low']);
    expect(res.rankedConcepts.map(c => c.slot)).toEqual(['A', 'B', 'C']);
    expect(res.rankedConcepts[0].confidence).toBe('strong');
    expect(res.topLineNote).toBeNull();
  });

  it('fires the Creative Lab note when every match is a stretch', () => {
    const scored: ScoredConcept[] = [{ conceptId: 'a', scores: axes(30, 30, 30) }];
    const byId = new Map([['a', candidate('a')]]);
    const res = rankAndLabel(scored, byId);
    expect(res.rankedConcepts[0].confidence).toBe('stretch');
    expect(res.topLineNote).toContain('Creative Lab');
  });

  it('passes through candidate fields and builds confidenceReason from axis reasons', () => {
    const scored: ScoredConcept[] = [{ conceptId: 'a', scores: axes(80, 75, 60) }];
    const byId = new Map([['a', candidate('a')]]);
    const res = rankAndLabel(scored, byId);
    const m = res.rankedConcepts[0];
    expect(m.conceptName).toBe('Concept a');
    expect(m.budgetFlag).toBe('within-range');
    expect(m.partnerTypeMatch).toBe('same-category');
    expect(m.confidenceReason).toContain('pr');
    expect(m.estimatedProductionTimeline).toBe('10 weeks');
  });

  it('drops scored concepts that are not in the candidate map', () => {
    const scored: ScoredConcept[] = [{ conceptId: 'ghost', scores: axes(90, 90, 90) }];
    const res = rankAndLabel(scored, new Map());
    expect(res.rankedConcepts).toHaveLength(0);
  });
});
