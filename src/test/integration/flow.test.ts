import { describe, it, expect } from 'vitest';
import { SECTION_KEYS, SECTION_CONFIG, createInitialState } from '@/lib/types';

describe('Integration: Full Flow', () => {
  it('should have 9 sections starting with objective', () => {
    expect(SECTION_KEYS.length).toBe(9);
    expect(SECTION_KEYS[0]).toBe('objective');
  });

  it('should create initial state with all sections', () => {
    const state = createInitialState();
    expect(state.sections.length).toBe(9);
    expect(state.sections[0].key).toBe('objective');
  });

  it('should have correct section order (Gate1, Gate2, Appendix)', () => {
    const expectedOrder = [
      // Gate 1
      'objective',
      'budget',
      'audience',
      'creative_task',
      // Gate 2
      'brand_alignment',
      'audience_insights',
      'creative_tenets',
      'media_context',
      // Appendix
      'research_stimuli',
    ];
    expect(SECTION_KEYS).toEqual(expectedOrder);
  });

  it('should have correct order numbers in SECTION_CONFIG', () => {
    expect(SECTION_CONFIG.objective.order).toBe(0);
    expect(SECTION_CONFIG.budget.order).toBe(1);
    expect(SECTION_CONFIG.audience.order).toBe(2);
    expect(SECTION_CONFIG.creative_task.order).toBe(3);
    expect(SECTION_CONFIG.brand_alignment.order).toBe(4);
    expect(SECTION_CONFIG.audience_insights.order).toBe(5);
    expect(SECTION_CONFIG.creative_tenets.order).toBe(6);
    expect(SECTION_CONFIG.media_context.order).toBe(7);
    expect(SECTION_CONFIG.research_stimuli.order).toBe(8);
  });

  it('should initialize with null values for new state fields', () => {
    const state = createInitialState();
    expect(state.triageResult).toBeNull();
    expect(state.currentSectionOptions).toBeNull();
    expect(state.selectedOptionLevel).toBeNull();
    expect(state.audienceMenu).toBeNull();
    expect(state.selectedAudienceSegment).toBeNull();
    expect(state.personification).toBeNull();
  });

  it('should have all sections with initial red status', () => {
    const state = createInitialState();
    state.sections.forEach((section) => {
      expect(section.status).toBe('red');
      expect(section.content).toBe('');
      expect(section.feedback).toBe('');
    });
  });
});
