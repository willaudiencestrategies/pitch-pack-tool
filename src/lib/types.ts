// src/lib/types.ts

export type Status = 'green' | 'amber' | 'red';

// Gate-based step flow
export type Step = 'upload' | 'triage' | 'context' | 'gate1_sections' | 'gate_transition' | 'gate2_brand' | 'gate2_audience' | 'gate2_insights' | 'gate2_tenets' | 'gate2_media' | 'output';

// Section keys by gate
export type Gate1SectionKey = 'objective' | 'budget' | 'audience' | 'creative_task';
export type Gate2SectionKey = 'brand_alignment' | 'audience_insights' | 'creative_tenets' | 'media_context';
export type AppendixKey = 'research_stimuli';
export type SectionKey = Gate1SectionKey | Gate2SectionKey | AppendixKey;

// Section key arrays for iteration
export const GATE1_SECTION_KEYS: Gate1SectionKey[] = [
  'objective',
  'budget',
  'audience',
  'creative_task',
];

export const GATE2_SECTION_KEYS: Gate2SectionKey[] = [
  'brand_alignment',
  'audience_insights',
  'creative_tenets',
  'media_context',
];

export const APPENDIX_KEYS: AppendixKey[] = ['research_stimuli'];

export const SECTION_KEYS: SectionKey[] = [
  ...GATE1_SECTION_KEYS,
  ...GATE2_SECTION_KEYS,
  ...APPENDIX_KEYS,
];

export const SECTION_CONFIG: Record<SectionKey, { name: string; order: number; gate: 'gate1' | 'gate2' | 'appendix' }> = {
  objective: { name: 'Objective', order: 0, gate: 'gate1' },
  budget: { name: 'Budget', order: 1, gate: 'gate1' },
  audience: { name: 'Audience', order: 2, gate: 'gate1' },
  creative_task: { name: 'Creative Task', order: 3, gate: 'gate1' },
  brand_alignment: { name: 'Brand Alignment', order: 4, gate: 'gate2' },
  audience_insights: { name: 'Audience Insights', order: 5, gate: 'gate2' },
  creative_tenets: { name: 'Creative Tenets', order: 6, gate: 'gate2' },
  media_context: { name: 'Media Context', order: 7, gate: 'gate2' },
  research_stimuli: { name: 'Research Stimuli', order: 8, gate: 'appendix' },
};

// Legacy mapping for backwards compatibility during migration
export const LEGACY_SECTION_MAP: Record<string, SectionKey> = {
  human_truths: 'audience_insights',
  media_strategy: 'media_context',
};

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

// Brand Alignment (Gate 2 - NEW)
export type ExpediaBrand = 'expedia' | 'hotels_com' | 'vrbo';

export interface BrandAlignment {
  brand: ExpediaBrand | null;
  hasDGMatch: boolean;
  brandAudience?: string; // Placeholder for brand audience definition
}

// Budget Details (enhanced)
export interface BudgetDetails {
  totalBudget: string;
  productionBudget: string;
  currency: string;
}

// Audience Prioritisation (Gate 2)
export interface AudiencePrioritisation {
  primary: AudienceSegment;
  secondary: AudienceSegment[]; // Max 2
}

// Brief Score (stub for analytics)
export interface BriefScore {
  sellerName?: string;
  timestamp: string;
  gate1Scores: Partial<Record<Gate1SectionKey, Status>>;
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
  currentGate: 'gate1' | 'gate2' | 'output';
  brief: string;
  additionalContext: string;

  // Enhanced triage
  triageResult: EnhancedTriageResponse | null;

  // Section building with options
  sections: Section[];
  currentSectionIndex: number;
  currentSectionOptions: SectionOptionsResponse | null;
  selectedOptionLevel: OptionLevel | null;

  // Gate 2: Brand Alignment
  brandAlignment: BrandAlignment | null;

  // Gate 2: Budget Details
  budgetDetails: BudgetDetails | null;

  // Gate 2: Audience
  audienceMenu: AudienceSegmentMenu | null;
  selectedAudienceSegment: AudienceSegment | null;
  personification: PersonificationResponse | null;
  audiencePrioritisation: AudiencePrioritisation | null;

  // Gate 2: Audience Insights (renamed from Human Truths)
  insightOptions: Truth[]; // Renamed from truthOptions
  selectedInsights: Truth[]; // Renamed from selectedTruths, max 3

  // Output
  outputMarkdown: string | null;
  includeResearchStimuli: boolean; // Toggle for appendix

  // Analytics stub
  briefScore: BriefScore | null;

  error: string | null;
  loading: boolean;
}

export function createInitialState(): SessionState {
  return {
    step: 'upload',
    currentGate: 'gate1',
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
    brandAlignment: null,
    budgetDetails: null,
    audienceMenu: null,
    selectedAudienceSegment: null,
    personification: null,
    audiencePrioritisation: null,
    insightOptions: [],
    selectedInsights: [],
    outputMarkdown: null,
    includeResearchStimuli: false,
    briefScore: null,
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
  selectedInsights?: Truth[];
  includeResearchStimuli?: boolean;
  brandAlignment?: BrandAlignment;
}

export interface OutputResponse {
  markdown: string;
}

// Two-Step Audience Types
export interface AudienceSegment {
  id: number;
  name: string;
  needsValues: string;
  demographics: string;
}

export interface AudienceSegmentMenu {
  intro: string;
  segments: AudienceSegment[];
}

export interface PersonificationResponse {
  intro: string;
  narrative: string;
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

// Creative Tenets Generation (NEW - v1.2)
export interface CreativeTenetsRequest {
  brief: string;
  objective: string;
  audience: AudienceSegment;
  insights: Truth[];
  additionalContext?: string;
}

export interface CreativeTenetsResponse {
  tenets: string[];
  intro: string;
}
