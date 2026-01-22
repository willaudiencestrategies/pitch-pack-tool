import { describe, it, expect } from 'vitest';
import {
  SECTION_KEYS,
  SECTION_CONFIG,
  SectionKey,
  SectionOption,
  SectionOptionsResponse,
  OptionLevel,
  AudienceSegment,
  AudienceSegmentMenu,
  PersonificationResponse,
} from './types';

describe('Section Configuration', () => {
  it('should include budget as the first section', () => {
    expect(SECTION_KEYS[0]).toBe('budget');
  });

  it('should have 8 sections total', () => {
    expect(SECTION_KEYS.length).toBe(8);
  });

  it('should have budget config with order 0', () => {
    expect(SECTION_CONFIG.budget).toEqual({ name: 'Budget', order: 0 });
  });
});

describe('Four-Option Response Types', () => {
  it('should have SectionOption with required fields', () => {
    const option: SectionOption = {
      level: 'lifted',
      content: 'Test content',
      reasoning: 'Why this option',
      watchFor: 'What to watch for',
      whenToChoose: 'When to choose this',
    };
    expect(option.level).toBe('lifted');
  });

  it('should have SectionOptionsResponse with 4 options', () => {
    const response: SectionOptionsResponse = {
      currentState: 'Current state text',
      alignmentCheck: 'Alignment assessment',
      options: [
        { level: 'lifted', content: '', reasoning: '', watchFor: '', whenToChoose: '' },
        { level: 'light', content: '', reasoning: '', watchFor: '', whenToChoose: '' },
        { level: 'inspired', content: '', reasoning: '', watchFor: '', whenToChoose: '' },
        { level: 'ruthless', content: '', reasoning: '', watchFor: '', whenToChoose: '' },
      ],
    };
    expect(response.options.length).toBe(4);
  });
});

describe('Two-Step Audience Types', () => {
  it('should have AudienceSegment with required fields', () => {
    const segment: AudienceSegment = {
      id: 1,
      name: 'Reckonings',
      needsValues: 'Rich description of needs/values/motivations',
      demographics: 'Observable behaviours/demographics',
    };
    expect(segment.name).toBe('Reckonings');
  });

  it('should have AudienceSegmentMenu with 5 segments', () => {
    const menu: AudienceSegmentMenu = {
      intro: 'Based on everything...',
      segments: [
        { id: 1, name: 'Reckonings', needsValues: 'desc', demographics: 'demo' },
        { id: 2, name: 'Inheritors', needsValues: 'desc', demographics: 'demo' },
        { id: 3, name: 'Collectors', needsValues: 'desc', demographics: 'demo' },
        { id: 4, name: 'Rewilders', needsValues: 'desc', demographics: 'demo' },
        { id: 5, name: 'Contrarians', needsValues: 'desc', demographics: 'demo' },
      ],
    };
    expect(menu.segments.length).toBe(5);
  });

  it('should have PersonificationResponse with narrative', () => {
    const response: PersonificationResponse = {
      intro: 'Thanks. Based on everything...',
      narrative: 'Rich 150-300 word description...',
    };
    expect(response.narrative).toBeDefined();
  });
});
