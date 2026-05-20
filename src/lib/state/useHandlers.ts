'use client';

import {
  SessionState,
  Section,
  Step,
  EnhancedTriageResponse,
  SectionResponse,
  TruthsResponse,
  OutputResponse,
  AudienceSegment,
  AudienceSegmentMenu,
  AudiencePrioritisation,
  PersonificationResponse,
  SECTION_CONFIG,
  GATE1_SECTION_KEYS,
  BrandAlignment,
  CreativeTenetsResponse,
  CreativeTenet,
  AudienceBranch,
  BudgetDetails,
  VaultCategory,
  Truth,
  NarrativeDraft,
  createInitialState,
} from '../types';
import { logAnalytics, captureBriefScore } from '../analytics';
import { UseProgressHooksReturn } from './useProgressHooks';

export interface UseHandlersReturn {
  // Navigation
  handleNavigateToStep: (step: Step) => void;
  // Gate 1 triage / sections
  handleTriage: () => Promise<void>;
  handleTriageReassess: () => Promise<void>;
  handleSectionReassess: (additionalInfo: string) => Promise<void>;
  handleSectionGenerate: () => Promise<void>;
  // Gate 1 fields
  handleBudgetConfirm: (budget: BudgetDetails) => void;
  // Gate 2 brand / audience / insights
  handleBrandAlignment: (alignment: BrandAlignment) => void;
  handleGenerateAudience: (feedback?: string) => Promise<void>;
  handleSelectAudience: (
    segments: AudienceSegment[],
    prioritisation: AudiencePrioritisation
  ) => Promise<void>;
  handleGeneratePersonificationForBranch: (
    segment: AudienceSegment
  ) => Promise<void>;
  handleGenerateInsights: () => Promise<void>;
  handleConfirmInsights: () => void;
  // Gate 2 tenets / output
  handleGenerateTenets: () => Promise<CreativeTenetsResponse>;
  handleConfirmTenets: (tenets: CreativeTenet[]) => void;
  handleCompileOutput: () => Promise<void>;
  // Gate 1 navigation helpers (lifted because handlers call them)
  goToNextGate1Section: () => void;
  goToPreviousGate1Section: () => void;
  // Vault handlers added in Phase 2 (stubs):
  handleVaultDecision: (decision: 'vault' | 'creative-lab') => void;
  handleVaultAudiencePick: (branchIndex: number | 'all') => void;
  handleVaultProductionBudgetConfirm: (budget: number) => void;
  handleVaultSelectConcept: (conceptId: string) => void;
  handleVaultProceedToDraft: () => void;
  handleVaultGenerateNarrative: () => Promise<void>;
  handleVaultExport: () => Promise<void>;
}

export interface UseHandlersDeps {
  state: SessionState;
  updateState: (partial: Partial<SessionState>) => void;
  progress: UseProgressHooksReturn;
  pushHistory: (action: string, snapshot: Partial<SessionState>) => void;
  setLastAction: (action: (() => void) | null) => void;
}

// ============================================
// Vault helpers (top-level, pure)
// ============================================

export function derivePartnerType(state: SessionState): VaultCategory | null {
  // v1 heuristic: scan objective + creative_task for category signals.
  // Default to 'destination' (most common case) when nothing matches.
  const objective = state.sections.find(s => s.key === 'objective')?.content?.toLowerCase() || '';
  const creativeTask = state.sections.find(s => s.key === 'creative_task')?.content?.toLowerCase() || '';
  const text = `${objective} ${creativeTask}`;
  if (!text.trim()) return null;
  if (/airline|aviation|flight/.test(text)) return 'airline';
  if (/rental car|car hire|automotive/.test(text)) return 'car';
  if (/hotel|lodging|resort|property|vrbo|short-term rental/.test(text)) return 'lodging';
  return 'destination';
}

export function deriveProductionBudgetUsd(state: SessionState): number | null {
  if (state.productionBudgetUsd) return state.productionBudgetUsd;
  const raw = state.budgetDetails?.productionBudget;
  if (!raw) return null;
  const match = raw.match(/[\d,]+/);
  if (!match) return null;
  const parsed = parseInt(match[0].replace(/,/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useHandlers(deps: UseHandlersDeps): UseHandlersReturn {
  const { state, updateState, progress, pushHistory, setLastAction } = deps;

  // NOTE: Each handler below is lifted verbatim from page.tsx, with the
  // following transformations applied:
  //   - `triageProgress.x`   → `progress.triage.x`
  //   - `audienceProgress.x` → `progress.audience.x`
  //   - `insightsProgress.x` → `progress.insights.x`
  // All other reads (`state.x`), `updateState(...)`, `pushHistory(...)`, and
  // `setLastAction(...)` calls stay the same — they're closure references in
  // the original and now they're function deps in this hook, identical shape.

  // Navigation handler for progress bar
  const handleNavigateToStep = (step: Step) => {
    if (step === 'upload') {
      updateState(createInitialState());
      return;
    }
    updateState({ step });
    // Update gate based on step
    if (step === 'triage' || step === 'gate1_sections') {
      updateState({ currentGate: 'gate1' });
    } else if (step.startsWith('gate2_') || step === 'gate_transition') {
      updateState({ currentGate: 'gate2' });
    } else if (step === 'output') {
      updateState({ currentGate: 'output' });
    }
    // Reset section index for gate1 sections
    if (step === 'gate1_sections') {
      updateState({ currentSectionIndex: 0 });
    }
  };

  // ============================================
  // API Handlers
  // ============================================

  const handleTriage = async () => {
    if (!state.brief.trim()) {
      updateState({ error: 'Please paste your brief first' });
      return;
    }

    updateState({ loading: true, error: null });
    setLastAction(() => handleTriage);
    progress.triage.runSimulatedProgress();

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: state.brief }),
      });

      if (!response.ok) throw new Error('Failed to assess brief');

      const data: EnhancedTriageResponse = await response.json();

      // Defensive: ensure triageAssessment is an array
      const triageAssessment = Array.isArray(data.triageAssessment) ? data.triageAssessment : [];

      // Transform EnhancedTriageResponse into Section[] for UI
      const sections: Section[] = triageAssessment.map((result) => ({
        key: result.key,
        name: SECTION_CONFIG[result.key]?.name || result.key,
        status: result.status || 'red',
        // Prefer verbatimQuotes (actual brief content) over synthesizedContent (AI interpretation)
        content: result.verbatimQuotes?.length
          ? result.verbatimQuotes.join('\n\n')
          : result.synthesizedContent || '',
        feedback: (result.whyThisRating || '') + (result.whatNeeded ? `\n\nNeeded: ${result.whatNeeded}` : ''),
        questions: result.questions || [],
        gaps: [...(result.contradictions || []), ...(result.vagueness || [])],
      }));

      // If no sections came back, something went wrong
      if (sections.length === 0) {
        throw new Error('No sections returned from triage');
      }

      progress.triage.complete();
      updateState({
        sections,
        triageResult: data,
        step: 'triage',
        loading: false,
      });
    } catch (err) {
      progress.triage.reset();
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleTriageReassess = async () => {
    if (!state.brief.trim()) {
      updateState({ error: 'Please paste your brief first' });
      return;
    }

    updateState({ loading: true, error: null });
    setLastAction(() => handleTriageReassess);
    progress.triage.runSimulatedProgress();

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          additionalContext: state.additionalContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to reassess brief');

      const data: EnhancedTriageResponse = await response.json();

      // Defensive: ensure triageAssessment is an array
      const triageAssessment = Array.isArray(data.triageAssessment) ? data.triageAssessment : [];

      // Transform EnhancedTriageResponse into Section[] for UI
      const sections: Section[] = triageAssessment.map((result) => ({
        key: result.key,
        name: SECTION_CONFIG[result.key]?.name || result.key,
        status: result.status || 'red',
        content: result.verbatimQuotes?.length
          ? result.verbatimQuotes.join('\n\n')
          : result.synthesizedContent || '',
        feedback: (result.whyThisRating || '') + (result.whatNeeded ? `\n\nNeeded: ${result.whatNeeded}` : ''),
        questions: result.questions || [],
        gaps: [...(result.contradictions || []), ...(result.vagueness || [])],
      }));

      if (sections.length === 0) {
        throw new Error('No sections returned from triage');
      }

      progress.triage.complete();
      updateState({
        sections,
        triageResult: data,
        reassessCount: state.reassessCount + 1,
        lastReassessedAt: new Date().toISOString(),
        loading: false,
      });
    } catch (err) {
      progress.triage.reset();
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleSectionReassess = async (additionalInfo: string) => {
    const section = state.sections[state.currentSectionIndex];

    // Push current state to history before reassessing
    pushHistory(`Reassess ${section.name}`, { sections: [...state.sections] });

    updateState({ loading: true, error: null });
    setLastAction(() => () => handleSectionReassess(additionalInfo));

    try {
      const response = await fetch('/api/section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: section.key,
          brief: state.brief,
          currentContent: section.content,
          additionalContext: state.additionalContext + '\n' + additionalInfo,
          action: 'reassess',
        }),
      });

      if (!response.ok) throw new Error('Failed to reassess section');

      const data: SectionResponse = await response.json();

      const updatedSections = [...state.sections];
      updatedSections[state.currentSectionIndex] = {
        ...section,
        status: data.status,
        // content stays as-is until user accepts suggestion
        feedback: data.feedback,
        suggestion: data.suggestion,  // This shows in the suggestion box
        questions: data.questions,
      };

      updateState({
        sections: updatedSections,
        additionalContext: state.additionalContext + '\n' + additionalInfo,
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleSectionGenerate = async () => {
    const section = state.sections[state.currentSectionIndex];
    updateState({ loading: true, error: null });
    setLastAction(() => handleSectionGenerate);

    try {
      const response = await fetch('/api/section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: section.key,
          brief: state.brief,
          currentContent: section.content,
          additionalContext: state.additionalContext,
          action: 'generate',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate suggestion');

      const data: SectionResponse = await response.json();

      const updatedSections = [...state.sections];
      updatedSections[state.currentSectionIndex] = {
        ...section,
        suggestion: data.suggestion,
      };

      updateState({ sections: updatedSections, loading: false });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleGenerateAudience = async (feedback?: string) => {
    // Update step immediately so progress bar shows Audience during loading
    updateState({ loading: true, error: null, step: 'gate2_audience' });
    setLastAction(() => () => handleGenerateAudience(feedback));
    progress.audience.runSimulatedProgress();

    try {
      const response = await fetch('/api/generate/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          additionalContext: state.additionalContext,
          feedback,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate audience options');

      const data: AudienceSegmentMenu = await response.json();
      progress.audience.complete();
      updateState({
        audienceMenu: data,
        loading: false,
      });
    } catch (err) {
      progress.audience.reset();
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleSelectAudience = async (segments: AudienceSegment[], prioritisation: AudiencePrioritisation) => {
    // Create branches for all selected segments (primary + secondary)
    // Primary is always first, secondary segments follow
    const allSegments = [prioritisation.primary, ...prioritisation.secondary];
    const branches: AudienceBranch[] = allSegments.map(segment => ({
      segment,
      personification: null,
      insights: [],
    }));

    // Start with the first branch (primary segment)
    const primarySegment = prioritisation.primary;

    updateState({
      loading: true,
      error: null,
      selectedAudienceSegment: primarySegment,
      audiencePrioritisation: prioritisation,
      audienceBranches: branches,
      currentBranchIndex: 0,
    });
    setLastAction(() => () => handleSelectAudience(segments, prioritisation));

    try {
      const response = await fetch('/api/generate/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          additionalContext: state.additionalContext,
          selectedSegment: primarySegment,
          secondarySegments: prioritisation.secondary.map(s => s.name),
          isMerged: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to personify audience');

      const data: PersonificationResponse = await response.json();

      // Update the first branch with the personification
      const updatedBranches = [...branches];
      updatedBranches[0] = { ...updatedBranches[0], personification: data };

      updateState({
        personification: data,
        audienceBranches: updatedBranches,
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  // Generate personification for a specific branch segment (used when processing multiple audiences)
  const handleGeneratePersonificationForBranch = async (segment: AudienceSegment) => {
    updateState({ loading: true, error: null });
    setLastAction(() => () => handleGeneratePersonificationForBranch(segment));

    try {
      const response = await fetch('/api/generate/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          additionalContext: state.additionalContext,
          selectedSegment: segment,
          isMerged: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to personify audience');

      const data: PersonificationResponse = await response.json();

      // Update the current branch with the personification
      const updatedBranches = [...state.audienceBranches];
      if (updatedBranches[state.currentBranchIndex]) {
        updatedBranches[state.currentBranchIndex] = {
          ...updatedBranches[state.currentBranchIndex],
          personification: data,
        };
      }

      updateState({
        personification: data,
        audienceBranches: updatedBranches,
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleGenerateInsights = async () => {
    if (!state.selectedAudienceSegment || !state.personification) return;

    // Update step immediately so progress bar shows Insights during loading
    updateState({ loading: true, error: null, step: 'gate2_insights' });
    setLastAction(() => handleGenerateInsights);
    progress.insights.runSimulatedProgress();

    try {
      const response = await fetch('/api/generate/truths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: state.selectedAudienceSegment,
          personification: state.personification.narrative,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate insights');

      const data: TruthsResponse = await response.json();
      progress.insights.complete();
      updateState({
        insightOptions: data.truths,
        loading: false,
      });
    } catch (err) {
      progress.insights.reset();
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  // Brand Alignment handler (Gate 2)
  const handleBrandAlignment = (alignment: BrandAlignment) => {
    updateState({
      brandAlignment: alignment,
      step: 'gate2_audience',
    });
  };

  // Budget confirmation handler (Gate 1)
  const handleBudgetConfirm = (budget: BudgetDetails) => {
    pushHistory('Confirm budget', { budgetDetails: state.budgetDetails });
    updateState({ budgetDetails: budget });
    goToNextGate1Section();
  };

  // Generate Creative Tenets (Gate 2)
  const handleGenerateTenets = async (): Promise<CreativeTenetsResponse> => {
    if (!state.selectedAudienceSegment || state.selectedInsights.length === 0) {
      throw new Error('Audience and insights required');
    }

    updateState({ loading: true, error: null });
    setLastAction(() => () => handleGenerateTenets());

    try {
      // Get objective from sections
      const objectiveSection = state.sections.find((s) => s.key === 'objective');
      const objective = objectiveSection?.content || '';

      const response = await fetch('/api/generate/tenets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          objective,
          audience: state.selectedAudienceSegment,
          insights: state.selectedInsights,
          additionalContext: state.additionalContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate tenets');

      const data: CreativeTenetsResponse = await response.json();
      updateState({ loading: false });
      return data;
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
      throw err;
    }
  };

  // Confirm tenets and continue to media step
  const handleConfirmTenets = (tenets: CreativeTenet[]) => {
    pushHistory('Confirm creative tenets', { sections: [...state.sections] });
    const updatedSections = [...state.sections];
    const tenetsIndex = updatedSections.findIndex((s) => s.key === 'creative_tenets');
    if (tenetsIndex >= 0) {
      const content = tenets.map((t) => {
        const dots = t.explanation.map((e) => `- ${e}`).join('\n');
        return `**${t.headline}**\n${dots}\nDifferentiator: ${t.differentiator}`;
      }).join('\n\n');
      updatedSections[tenetsIndex] = {
        ...updatedSections[tenetsIndex],
        status: 'green',
        content,
      };
    }
    updateState({
      sections: updatedSections,
      step: 'gate2_media',
    });
  };

  const handleCompileOutput = async () => {
    updateState({ loading: true, error: null });
    setLastAction(() => handleCompileOutput);

    try {
      const response = await fetch('/api/output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: state.sections,
          audience: state.selectedAudienceSegment,
          personification: state.personification?.narrative || '',
          selectedInsights: state.selectedInsights,
          includeResearchStimuli: state.includeResearchStimuli,
        }),
      });

      if (!response.ok) throw new Error('Failed to compile output');

      const data: OutputResponse = await response.json();

      // Log analytics when output is generated
      logAnalytics(captureBriefScore(state));

      // Store markdown for inline display
      updateState({
        step: 'output',
        loading: false,
        outputMarkdown: data.markdown,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  // Navigation helpers for two-gate flow
  function goToNextGate1Section() {
    // Get only Gate 1 sections
    const gate1Sections = state.sections.filter((s) =>
      GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
    );
    const nextIndex = state.currentSectionIndex + 1;

    if (nextIndex < gate1Sections.length) {
      updateState({ currentSectionIndex: nextIndex });
    } else {
      // Finished Gate 1, go to transition
      updateState({ step: 'gate_transition' });
    }
  }

  function goToPreviousGate1Section() {
    if (state.currentSectionIndex > 0) {
      updateState({ currentSectionIndex: state.currentSectionIndex - 1 });
    } else {
      updateState({ step: 'triage' });
    }
  }

  // ============================================
  // Vault handlers (Phase 2)
  // ============================================

  interface MatcherArgs {
    partnerType?: VaultCategory | null;
    productionBudgetUsd?: number | null;
    branchInsights?: Truth[];
  }

  const fireBackgroundMatcher = async (overrides?: MatcherArgs) => {
    // Fires after insights confirm so the preview signal is ready BEFORE the
    // decision screen renders. Never awaited by the caller.
    //
    // Accepts explicit overrides so callers that fire-and-forget via setTimeout
    // don't depend on the closure's view of `state` (which may be stale by the
    // time the macrotask runs).
    try {
      const partnerType = overrides?.partnerType ?? derivePartnerType(state);
      const productionBudgetUsd =
        overrides?.productionBudgetUsd ?? deriveProductionBudgetUsd(state);
      if (!partnerType || !productionBudgetUsd) {
        updateState({
          vaultMatchPreview: {
            signal: 'none',
            rankedCount: 0,
            topConceptName: null,
            cachedAt: new Date().toISOString(),
          },
        });
        return;
      }

      const branchInsights =
        overrides?.branchInsights ??
        state.audienceBranches[state.currentBranchIndex]?.insights ??
        state.selectedInsights;

      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'match',
          brief: state.brief,
          briefSections: Object.fromEntries(state.sections.map(s => [s.key, s.content])),
          insights: branchInsights,
          partnerType,
          productionBudgetUsd,
          mustHaveChannels: [],
        }),
      });

      if (!res.ok) throw new Error(`Vault matcher failed: ${res.status}`);

      const data = await res.json();
      const ranked = Array.isArray(data.rankedConcepts) ? data.rankedConcepts : [];
      const signal: 'strong' | 'plausible' | 'stretch' | 'none' =
        !ranked.length ? 'none'
        : ranked.some((m: { confidence?: string }) => m.confidence === 'strong') ? 'strong'
        : ranked.some((m: { confidence?: string }) => m.confidence === 'plausible') ? 'plausible'
        : 'stretch';

      updateState({
        vaultMatchPreview: {
          signal,
          rankedCount: ranked.length,
          topConceptName: ranked[0]?.conceptName || null,
          cachedAt: new Date().toISOString(),
        },
        vaultResult: {
          rankedConcepts: ranked,
          selectedConceptIds: [],
          narrativeDrafts: {},
          customEdits: {},
          exportedAt: null,
          resumeToken: null,
          topLineNote: data.topLineNote ?? null,
        },
      });
    } catch (err) {
      console.error('Background matcher failed:', err);
      updateState({
        vaultMatchPreview: {
          signal: 'none',
          rankedCount: 0,
          topConceptName: null,
          cachedAt: new Date().toISOString(),
        },
      });
    }
  };

  const handleConfirmInsights = () => {
    // Persist insights to the current branch (preserves branching invariant)
    const updatedBranches = [...state.audienceBranches];
    if (updatedBranches[state.currentBranchIndex]) {
      updatedBranches[state.currentBranchIndex] = {
        ...updatedBranches[state.currentBranchIndex],
        insights: [...state.selectedInsights],
      };
    }

    const partnerType = derivePartnerType(state);
    const productionBudgetUsd = deriveProductionBudgetUsd(state);

    updateState({
      audienceBranches: updatedBranches,
      partnerType,
      productionBudgetUsd,
      step: 'vault_decision',
    });

    // Fire background matcher AFTER UI advances. Not awaited.
    // Pass derived values explicitly so the setTimeout callback doesn't depend
    // on a stale closure view of `state`.
    setTimeout(
      () => { fireBackgroundMatcher({ partnerType, productionBudgetUsd }); },
      0
    );
  };

  const handleVaultDecision = (decision: 'vault' | 'creative-lab') => {
    if (decision === 'creative-lab') {
      updateState({ step: 'gate2_tenets' });
      return;
    }
    // Vault path: route to picker if multi-branch, else to production budget gate
    if (state.audienceBranches.length > 1) {
      updateState({ step: 'vault_audience_picker' });
    } else {
      const branchIdx = state.currentBranchIndex || 0;
      updateState({
        step: 'vault_production_budget',
        vaultAudienceBranchIndex: branchIdx,
      });
    }
  };

  const handleVaultAudiencePick = (branchIndex: number | 'all') => {
    // Resolve which insights the matcher should weight, based on the CP's
    // explicit pick. 'all' merges every branch's insights into one call.
    const branchInsights =
      branchIndex === 'all'
        ? state.audienceBranches.flatMap(b => b.insights)
        : state.audienceBranches[branchIndex]?.insights || [];

    updateState({
      vaultAudienceBranchIndex: branchIndex,
      step: state.productionBudgetUsd ? 'vault_matches' : 'vault_production_budget',
    });

    // Re-fire matcher with the chosen branch's insights. Explicit args avoid
    // any closure-staleness on state.vaultAudienceBranchIndex.
    const partnerType = state.partnerType ?? derivePartnerType(state);
    const productionBudgetUsd =
      state.productionBudgetUsd ?? deriveProductionBudgetUsd(state);
    setTimeout(
      () =>
        fireBackgroundMatcher({ partnerType, productionBudgetUsd, branchInsights }),
      0
    );
  };
  const handleVaultProductionBudgetConfirm = (budget: number) => {
    updateState({
      productionBudgetUsd: budget,
      step: 'vault_matches',
    });
    // Re-fire matcher with explicit overrides (no closure staleness)
    const partnerType = state.partnerType ?? derivePartnerType(state);
    const branchInsights =
      state.vaultAudienceBranchIndex === 'all'
        ? state.audienceBranches.flatMap(b => b.insights)
        : typeof state.vaultAudienceBranchIndex === 'number'
          ? state.audienceBranches[state.vaultAudienceBranchIndex]?.insights || state.selectedInsights
          : state.selectedInsights;
    setTimeout(
      () => fireBackgroundMatcher({ partnerType, productionBudgetUsd: budget, branchInsights }),
      0
    );
  };
  const handleVaultSelectConcept = (conceptId: string) => {
    const current = state.vaultResult?.selectedConceptIds || [];
    const next = current.includes(conceptId)
      ? current.filter(id => id !== conceptId)
      : [...current, conceptId];
    updateState({
      vaultResult: state.vaultResult ? { ...state.vaultResult, selectedConceptIds: next } : null,
    });
  };

  const handleVaultProceedToDraft = () => {
    // Advance from the match list to the narrative draft step
    if (!state.vaultResult?.selectedConceptIds.length) return;
    updateState({ step: 'vault_narrative_draft' });
    setTimeout(() => handleVaultGenerateNarrative(), 0);
  };

  const handleVaultGenerateNarrative = async () => {
    if (!state.vaultResult?.selectedConceptIds.length) return;
    updateState({ loading: true });
    try {
      const drafts: Record<string, NarrativeDraft> = {
        ...(state.vaultResult.narrativeDrafts || {}),
      };
      for (const conceptId of state.vaultResult.selectedConceptIds) {
        if (drafts[conceptId]) continue; // already generated
        const res = await fetch('/api/vault', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'narrative-draft',
            brief: state.brief,
            briefSections: Object.fromEntries(state.sections.map(s => [s.key, s.content])),
            insights:
              state.audienceBranches[state.currentBranchIndex]?.insights ||
              state.selectedInsights,
            partnerType: state.partnerType,
            productionBudgetUsd: state.productionBudgetUsd,
            selectedConceptId: conceptId,
            partnerName: state.brandAlignment?.brand || 'the partner',
          }),
        });
        const data = await res.json();
        drafts[conceptId] = data.draft;
      }
      updateState({
        loading: false,
        vaultResult: state.vaultResult
          ? { ...state.vaultResult, narrativeDrafts: drafts }
          : null,
      });
    } catch (err) {
      console.error('Narrative draft failed:', err);
      updateState({ loading: false, error: 'Failed to generate narrative draft' });
    }
  };
  const handleVaultExport = async () => {
    throw new Error('handleVaultExport: not implemented until Phase 2');
  };

  return {
    handleNavigateToStep,
    handleTriage,
    handleTriageReassess,
    handleSectionReassess,
    handleSectionGenerate,
    handleBudgetConfirm,
    handleBrandAlignment,
    handleGenerateAudience,
    handleSelectAudience,
    handleGeneratePersonificationForBranch,
    handleGenerateInsights,
    handleConfirmInsights,
    handleGenerateTenets,
    handleConfirmTenets,
    handleCompileOutput,
    goToNextGate1Section,
    goToPreviousGate1Section,
    handleVaultDecision,
    handleVaultAudiencePick,
    handleVaultProductionBudgetConfirm,
    handleVaultSelectConcept,
    handleVaultProceedToDraft,
    handleVaultGenerateNarrative,
    handleVaultExport,
  };
}
