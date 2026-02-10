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
  SynthesizedSection,
  TriageSectionResult,
  EnhancedTriageResponse,
  Status,
} from './types';

describe('Section Configuration', () => {
  it('should include objective as the first section', () => {
    expect(SECTION_KEYS[0]).toBe('objective');
  });

  it('should have 9 sections total (4 Gate1 + 4 Gate2 + 1 Appendix)', () => {
    expect(SECTION_KEYS.length).toBe(9);
  });

  it('should have objective config with order 0', () => {
    expect(SECTION_CONFIG.objective).toEqual({ name: 'Objective', order: 0, gate: 'gate1' });
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

describe('Enhanced Triage Types', () => {
  it('should have SynthesizedSection with required fields', () => {
    const section: SynthesizedSection = {
      content: 'What the brief says...',
      contradictions: ['Contradiction 1'],
      vagueness: ['Vague point 1'],
      quotes: ['Quote 1'],
    };
    expect(section.contradictions.length).toBe(1);
  });

  it('should have TriageSectionResult with all required fields', () => {
    const result: TriageSectionResult = {
      key: 'objective',
      status: 'amber',
      synthesizedContent: 'What the brief says...',
      contradictions: ['Contradiction 1'],
      vagueness: ['Vague point 1'],
      verbatimQuotes: ['Quote 1'],
      whyThisRating: 'Specific rationale',
      whatNeeded: 'What would improve',
      realityCheck: 'Assessment of impact',
      questions: ['Question 1'],
    };
    expect(result.whyThisRating).toBeDefined();
  });

  it('should have EnhancedTriageResponse with replay and assessment', () => {
    const emptySection: SynthesizedSection = { content: '', contradictions: [], vagueness: [], quotes: [] };
    const response: EnhancedTriageResponse = {
      synthesizedReplay: {
        objective: emptySection,
        budget: emptySection,
        audience: emptySection,
        creative_task: emptySection,
        brand_alignment: emptySection,
        audience_insights: emptySection,
        creative_tenets: emptySection,
        media_context: emptySection,
        research_stimuli: emptySection,
      },
      triageAssessment: [],
      overallBriefHealth: 'Summary...',
      coherenceAnalysis: { tensions: [], overallCoherence: 'mixed' },
    };
    expect(response.overallBriefHealth).toBeDefined();
  });
});
