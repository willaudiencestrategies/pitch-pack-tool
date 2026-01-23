// src/lib/types.ts

export type Status = 'green' | 'amber' | 'red';

export type Step = 'upload' | 'triage' | 'context' | 'sections' | 'audience' | 'truths' | 'output';

export type SectionKey =
  | 'budget'
  | 'objective'
  | 'creative_task'
  | 'audience'
  | 'human_truths'
  | 'creative_tenets'
  | 'media_strategy'
  | 'research_stimuli';

export const SECTION_CONFIG: Record<SectionKey, { name: string; order: number }> = {
  budget: { name: 'Budget', order: 0 },
  objective: { name: 'Objective', order: 1 },
  creative_task: { name: 'Creative Task', order: 2 },
  audience: { name: 'Audience', order: 3 },
  human_truths: { name: 'Human Truths', order: 4 },
  creative_tenets: { name: 'Creative Tenets', order: 5 },
  media_strategy: { name: 'Media Strategy', order: 6 },
  research_stimuli: { name: 'Research Stimuli', order: 7 },
};

export const SECTION_KEYS: SectionKey[] = [
  'budget',
  'objective',
  'creative_task',
  'audience',
  'human_truths',
  'creative_tenets',
  'media_strategy',
  'research_stimuli',
];

export interface Section {
  key: SectionKey;
  name: string;
  status: Status;
  content: string;
  feedback: string;
  suggestion?: string;
  gaps?: string[];
  questions?: string[];
}

export interface Segment {
  id: number;
  name: string;
  description: string;
  demographics: string;
}

export interface Truth {
  id: number;
  text: string;
  level: 'safer' | 'sharper' | 'bolder';
}

export interface SessionState {
  step: Step;
  brief: string;
  additionalContext: string;

  // Enhanced triage
  triageResult: EnhancedTriageResponse | null;

  // Section building with options
  sections: Section[];
  currentSectionIndex: number;
  currentSectionOptions: SectionOptionsResponse | null;
  selectedOptionLevel: OptionLevel | null;

  // Two-step audience
  audienceMenu: AudienceSegmentMenu | null;
  selectedAudienceSegment: AudienceSegment | null;
  personification: PersonificationResponse | null;

  // Human truths
  truthOptions: Truth[];
  selectedTruths: Truth[];

  // Output
  outputMarkdown: string | null;

  error: string | null;
  loading: boolean;
}

export function createInitialState(): SessionState {
  return {
    step: 'upload',
    brief: '',
    additionalContext: '',
    triageResult: null,
    sections: SECTION_KEYS.map((key) => ({
      key,
      name: SECTION_CONFIG[key].name,
      status: 'red' as Status,
      content: '',
      feedback: '',
    })),
    currentSectionIndex: 0,
    currentSectionOptions: null,
    selectedOptionLevel: null,
    audienceMenu: null,
    selectedAudienceSegment: null,
    personification: null,
    truthOptions: [],
    selectedTruths: [],
    outputMarkdown: null,
    error: null,
    loading: false,
  };
}

// API Types
export interface TriageRequest {
  brief: string;
}

export interface TriageResponse {
  sections: Section[];
  summary: string;
}

export interface SectionRequest {
  sectionKey: SectionKey;
  brief: string;
  currentContent: string;
  additionalContext: string;
  action: 'reassess' | 'generate';
}

export interface SectionResponse {
  status: Status;
  content: string;
  feedback: string;
  suggestion?: string;
  questions?: string[];
}

export interface AudienceRequest {
  brief: string;
  additionalContext: string;
  selectedSegment?: Segment;
}

export interface AudienceResponse {
  segments?: Segment[];
  personification?: string;
}

export interface TruthsRequest {
  audience: Segment;
  personification: string;
}

export interface TruthsResponse {
  truths: Truth[];
}

export interface OutputRequest {
  sections: Section[];
  audience?: Segment;
  personification?: string;
  selectedTruths?: Truth[];
}

export interface OutputResponse {
  markdown: string;
}

// Two-Step Audience Types
export interface AudienceSegment {
  id: number;
  name: string;         // Snappy 1-2 word name
  needsValues: string;  // Rich description of needs/values/motivations
  demographics: string; // Observable behaviours/demographics
}

export interface AudienceSegmentMenu {
  intro: string;
  segments: AudienceSegment[];
}

export interface PersonificationResponse {
  intro: string;
  narrative: string;  // 150-300 word vivid human sketch
}

// Four-Option Response Types
export type OptionLevel = 'lifted' | 'light' | 'inspired' | 'ruthless';

export interface SectionOption {
  level: OptionLevel;
  content: string;
  reasoning: string;
  watchFor: string;
  whenToChoose: string;
}

export interface SectionOptionsResponse {
  currentState: string;
  alignmentCheck?: string;
  options: SectionOption[];
  questions?: string[];
}

// Enhanced Triage Response Types
export interface SynthesizedSection {
  content: string;
  contradictions: string[];
  vagueness: string[];
  quotes: string[];
}

export interface TriageSectionResult {
  key: SectionKey;
  status: Status;
  synthesizedContent: string;
  contradictions: string[];
  vagueness: string[];
  verbatimQuotes: string[];
  whyThisRating: string;
  whatNeeded?: string;
  realityCheck: string;
  questions: string[];
}

export interface EnhancedTriageResponse {
  synthesizedReplay: Record<SectionKey, SynthesizedSection>;
  triageAssessment: TriageSectionResult[];
  overallBriefHealth: string;
}
