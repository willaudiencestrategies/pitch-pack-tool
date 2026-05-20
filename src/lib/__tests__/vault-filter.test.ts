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

  it('hard-excludes concepts more than 20% above the brief budget', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'too-expensive', productionBudget: [{ label: 's', minUsd: 500_000, maxUsd: 600_000 }] },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(0);
  });

  it('hard-excludes concepts more than 20% below the brief budget', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'too-cheap', productionBudget: [{ label: 's', minUsd: 50_000, maxUsd: 80_000 }] },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(0);
  });

  it('flags concepts within 10% of the cutoff edge as close-to-edge', () => {
    const concepts: VaultConcept[] = [
      // brief budget 300k. concept 350k (max) is at the edge. 360k (within 20% but >10% over max) is close-to-edge.
      { ...baseConcept, id: 'edge', productionBudget: [{ label: 's', minUsd: 340_000, maxUsd: 360_000 }] },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(1);
    expect(result[0].budgetFlag).toBe('close-to-edge');
  });

  it('excludes non-endemic in v1', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'klarna', category: 'non-endemic' },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(0);
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
