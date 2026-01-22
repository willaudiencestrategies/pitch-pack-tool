import { describe, it, expect } from 'vitest';
import { SECTION_KEYS, SECTION_CONFIG, createInitialState } from '@/lib/types';

describe('Integration: Full Flow', () => {
  it('should have 8 sections starting with budget', () => {
    expect(SECTION_KEYS.length).toBe(8);
    expect(SECTION_KEYS[0]).toBe('budget');
  });

  it('should create initial state with all sections', () => {
    const state = createInitialState();
    expect(state.sections.length).toBe(8);
    expect(state.sections[0].key).toBe('budget');
  });

  it('should have correct section order', () => {
    const expectedOrder = [
      'budget',
      'objective',
      'creative_task',
      'audience',
      'human_truths',
      'creative_tenets',
      'media_strategy',
      'research_stimuli',
    ];
    expect(SECTION_KEYS).toEqual(expectedOrder);
  });

  it('should have correct order numbers in SECTION_CONFIG', () => {
    expect(SECTION_CONFIG.budget.order).toBe(0);
    expect(SECTION_CONFIG.objective.order).toBe(1);
    expect(SECTION_CONFIG.creative_task.order).toBe(2);
    expect(SECTION_CONFIG.audience.order).toBe(3);
    expect(SECTION_CONFIG.human_truths.order).toBe(4);
    expect(SECTION_CONFIG.creative_tenets.order).toBe(5);
    expect(SECTION_CONFIG.media_strategy.order).toBe(6);
    expect(SECTION_CONFIG.research_stimuli.order).toBe(7);
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
