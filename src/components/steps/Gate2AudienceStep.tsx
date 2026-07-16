'use client';

import { useEffect } from 'react';
import { useBriefState } from '@/lib/state/BriefStateContext';
import { AudienceMenu } from '@/components/AudienceMenu';
import { PersonificationReview } from '@/components/PersonificationReview';
import { BranchProgress } from '@/components/BranchProgress';
import { LoadingProgress } from '@/components/LoadingProgress';
import { LoadingOverlay } from '@/components/steps/shared/LoadingOverlay';
import { AUDIENCE_STAGES, INSIGHTS_STAGES } from '@/lib/loading-config';

export function Gate2AudienceStep() {
  const { state, updateState, handlers, progress } = useBriefState();
  const {
    handleSelectAudience,
    handleGeneratePersonificationForBranch,
    handleGenerateInsights,
    handleGenerateAudience,
  } = handlers;

  const currentBranch = state.audienceBranches[state.currentBranchIndex];
  const isSubsequentBranch = state.currentBranchIndex > 0 && state.audienceBranches.length > 1;

  // Loading state for audience generation
  if (state.loading && !state.audienceMenu && progress.audience.isActive) {
    return (
      <LoadingProgress
        stages={AUDIENCE_STAGES}
        currentStageIndex={progress.audience.currentStageIndex}
        showTips={true}
      />
    );
  }

  // Loading state for personification
  if (state.loading && state.selectedAudienceSegment && !state.personification) {
    return (
      <LoadingOverlay
        message={`Developing ${state.selectedAudienceSegment.name}...`}
        subMessage="Creating a rich personification of this audience segment"
      />
    );
  }

  // Loading state for insights generation
  if (state.loading && state.personification && progress.insights.isActive) {
    return (
      <LoadingProgress
        stages={INSIGHTS_STAGES}
        currentStageIndex={progress.insights.currentStageIndex}
        showTips={true}
      />
    );
  }

  // For subsequent branches, auto-trigger personification if not already done
  if (isSubsequentBranch && state.selectedAudienceSegment && !state.personification && !state.loading) {
    // Trigger personification for this branch's segment
    handleGeneratePersonificationForBranch(currentBranch.segment);
    return (
      <LoadingOverlay
        message={`Developing ${currentBranch.segment.name}...`}
        subMessage="Creating a rich personification of this audience segment"
      />
    );
  }

  // Personification review using new component
  if (state.selectedAudienceSegment && state.personification) {
    return (
      <>
        {/* Branch Progress - show when multiple segments selected */}
        <BranchProgress branches={state.audienceBranches} currentIndex={state.currentBranchIndex} />
        <PersonificationReview
          segment={state.selectedAudienceSegment}
          personification={state.personification}
          onConfirm={(editedNarrative) => {
            // Update personification with edited narrative and save to branch
            const updatedBranches = [...state.audienceBranches];
            if (updatedBranches[state.currentBranchIndex]) {
              updatedBranches[state.currentBranchIndex] = {
                ...updatedBranches[state.currentBranchIndex],
                personification: { ...state.personification!, narrative: editedNarrative },
              };
            }
            updateState({
              personification: { ...state.personification!, narrative: editedNarrative },
              audienceBranches: updatedBranches,
            });
            // Revisit: restore this branch's saved insight options rather than
            // regenerating — selected ids are only meaningful against the
            // options they were picked from. Regenerate stays available on
            // the insights screen for a deliberate refresh.
            const storedBranch = state.audienceBranches[state.currentBranchIndex];
            if (storedBranch?.insightOptions?.length) {
              updateState({
                insightOptions: storedBranch.insightOptions,
                selectedInsights: storedBranch.insights ?? [],
                step: 'gate2_insights',
              });
            } else {
              handleGenerateInsights();
            }
          }}
          onBack={() => {
            if (isSubsequentBranch) {
              // Go back to previous branch's insights
              const prevIndex = state.currentBranchIndex - 1;
              const prevBranch = state.audienceBranches[prevIndex];
              updateState({
                currentBranchIndex: prevIndex,
                selectedAudienceSegment: prevBranch.segment,
                personification: prevBranch.personification,
                insightOptions: prevBranch.insightOptions ?? [],
                selectedInsights: prevBranch.insights,
                step: 'gate2_insights',
              });
            } else {
              updateState({ selectedAudienceSegment: null, personification: null });
            }
          }}
          loading={state.loading}
        />
      </>
    );
  }

  // Segment selection using new component
  if (state.audienceMenu) {
    return (
      <AudienceMenu
        menu={state.audienceMenu}
        onSelect={handleSelectAudience}
        onRegenerate={handleGenerateAudience}
        onBack={() => updateState({ step: 'gate2_brand' })}
        loading={state.loading}
      />
    );
  }

  // Auto-trigger audience generation if no menu yet
  useEffect(() => {
    if (!state.loading && !state.audienceMenu) {
      handleGenerateAudience();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loading, state.audienceMenu]);

  // Fallback while the effect kicks in
  return (
    <LoadingOverlay
      message="Preparing audience step..."
      subMessage="Loading audience generation"
    />
  );
}
