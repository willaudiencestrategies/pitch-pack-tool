import { describe, it, expect } from 'vitest';
import { filterVaultCandidates } from '../vault-filter';
import { VaultConcept } from '../types';

const baseConcept: VaultConcept = {
  id: 'test',
  name: 'Test Concept',
  conceptType: 'one-off',
  category: 'destination',
  archetype: [],
  ideaSummary: '',
  creativeMechanism: '',
  coreMessage: '',
  whatItsGoodFor: [],
  audienceFit: [],
  channelsFormats: ['video', 'social'],
  watchouts: [],
  previouslyPitchedTo: [],
  productionTimelineRaw: '12 weeks',
  productionTimeline: { minWeeks: 12, maxWeeks: 12 },
  productionBudgetRaw: '$300k (3x films)',
  productionBudget: [{ label: 'standard', minUsd: 250_000, maxUsd: 350_000 }],
  referenceLinks: [],
  lastValidated: null,
  eraTags: [],
};

describe('filterVaultCandidates', () => {
  it('keeps concepts within budget range', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'in-range', productionBudget: [{ label: 's', minUsd: 250_000, maxUsd: 350_000 }] },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(1);
    expect(result[0].budgetFlag).toBe('within-range');
  });

  it('never excludes on budget — keeps a concept well above the brief, flagged close-to-edge', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'too-expensive', productionBudget: [{ label: 's', minUsd: 500_000, maxUsd: 600_000 }] },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(1);
    expect(result[0].budgetFlag).toBe('close-to-edge');
  });

  it('never excludes on budget — keeps a concept well below the brief, flagged close-to-edge', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'too-cheap', productionBudget: [{ label: 's', minUsd: 50_000, maxUsd: 80_000 }] },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(1);
    expect(result[0].budgetFlag).toBe('close-to-edge');
  });

  it('flags concepts outside the ±50% comfort band as close-to-edge but keeps them', () => {
    const concepts: VaultConcept[] = [
      // brief 300k. comfort band is 150k–450k. 480k–520k sits past it → close-to-edge.
      { ...baseConcept, id: 'edge', productionBudget: [{ label: 's', minUsd: 480_000, maxUsd: 520_000 }] },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(1);
    expect(result[0].budgetFlag).toBe('close-to-edge');
  });

  it('flags concepts inside the ±50% comfort band as within-range', () => {
    const concepts: VaultConcept[] = [
      // brief 300k. comfort band 150k–450k. 350k–400k overlaps → within-range.
      { ...baseConcept, id: 'comfortable', productionBudget: [{ label: 's', minUsd: 350_000, maxUsd: 400_000 }] },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(1);
    expect(result[0].budgetFlag).toBe('within-range');
  });

  it('no longer hard-excludes non-endemic; it flows through as adjacent', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'klarna', category: 'non-endemic' },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(1);
    expect(result[0].partnerTypeMatch).toBe('adjacent');
  });

  it('filters out concepts missing must-have channels', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'video-only', channelsFormats: ['video'] },
      { ...baseConcept, id: 'has-ooh', channelsFormats: ['video', 'social', 'ooh'] },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: ['ooh'] });
    expect(result).toHaveLength(1);
    expect(result[0].concept.id).toBe('has-ooh');
  });

  it('passes partner type through without filtering', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'same', category: 'destination' },
      { ...baseConcept, id: 'cross', category: 'lodging' },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(2);
  });

  it('returns partnerTypeMatch annotation on each candidate', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'same', category: 'destination' },
      { ...baseConcept, id: 'cross', category: 'lodging' },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    const same = result.find(r => r.concept.id === 'same');
    const cross = result.find(r => r.concept.id === 'cross');
    expect(same?.partnerTypeMatch).toBe('same-category');
    expect(cross?.partnerTypeMatch).toBe('adjacent');
  });
});
