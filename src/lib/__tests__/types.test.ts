import { describe, it, expect } from 'vitest';
import {
  Gate1SectionKey,
  Gate2SectionKey,
  AppendixKey,
  SectionKey,
  GATE1_SECTION_KEYS,
  GATE2_SECTION_KEYS,
  APPENDIX_KEYS,
  BrandAlignment,
  BudgetDetails,
  AudiencePrioritisation,
  SessionState,
  createInitialState,
} from '../types';

describe('Gate types', () => {
  it('should have correct Gate 1 section keys', () => {
    expect(GATE1_SECTION_KEYS).toEqual(['objective', 'budget', 'audience', 'creative_task']);
  });

  it('should have correct Gate 2 section keys', () => {
    expect(GATE2_SECTION_KEYS).toEqual([
      'brand_alignment',
      'audience_insights',
      'creative_tenets',
      'media_context',
    ]);
  });

  it('should have research_stimuli as appendix', () => {
    expect(APPENDIX_KEYS).toEqual(['research_stimuli']);
  });

  it('should create initial state with currentGate as gate1', () => {
    const state = createInitialState();
    expect(state.currentGate).toBe('gate1');
    expect(state.brandAlignment).toBeNull();
    expect(state.budgetDetails).toBeNull();
    expect(state.audiencePrioritisation).toBeNull();
  });
});
