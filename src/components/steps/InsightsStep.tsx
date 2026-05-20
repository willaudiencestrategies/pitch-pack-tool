'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { Truth } from '@/lib/types';
import { BackButton } from '@/components/steps/shared/BackButton';
import { BranchProgress } from '@/components/BranchProgress';
import { GoodExamplePrompt } from '@/components/GoodExamplePrompt';
import { LoadingProgress } from '@/components/LoadingProgress';
import { INSIGHTS_STAGES } from '@/lib/loading-config';

export function InsightsStep() {
  const { state, updateState, handlers, progress, pushHistory } = useBriefState();
  const { handleGenerateInsights, handleConfirmInsights } = handlers;

  if (state.loading && state.insightOptions.length === 0 && progress.insights.isActive) {
    return (
      <LoadingProgress
        stages={INSIGHTS_STAGES}
        currentStageIndex={progress.insights.currentStageIndex}
        showTips={true}
      />
    );
  }

  const currentBranch = state.audienceBranches[state.currentBranchIndex];

  const toggleInsight = (insight: Truth) => {
    const isSelected = state.selectedInsights.some((t) => t.id === insight.id);
    if (isSelected) {
      updateState({
        selectedInsights: state.selectedInsights.filter((t) => t.id !== insight.id),
      });
    } else {
      // Limit to max 3 insights
      if (state.selectedInsights.length >= 3) {
        return; // Don't add more than 3
      }
      updateState({
        selectedInsights: [...state.selectedInsights, insight],
      });
    }
  };

  const updateInsightText = (id: number, text: string) => {
    const updatedInsights = state.insightOptions.map((t) => (t.id === id ? { ...t, text } : t));
    updateState({ insightOptions: updatedInsights });

    // Also update in selected if present
    const updatedSelected = state.selectedInsights.map((t) => (t.id === id ? { ...t, text } : t));
    updateState({ selectedInsights: updatedSelected });
  };

  // Display order: Bolder first, then Sharper, then Safer
  const insightsByLevel = {
    bolder: state.insightOptions.filter((t) => t.level === 'bolder'),
    sharper: state.insightOptions.filter((t) => t.level === 'sharper'),
    safer: state.insightOptions.filter((t) => t.level === 'safer'),
  };

  const levelLabels = {
    bolder: { label: 'Bolder', desc: 'Provocative, high impact', color: 'var(--status-red)' },
    sharper: { label: 'Sharper', desc: 'Clearer trade-offs, more distinctive', color: 'var(--status-amber)' },
    safer: { label: 'Safer', desc: 'Broad appeal, easy to execute', color: 'var(--status-green)' },
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackButton onClick={() => updateState({ step: 'gate2_audience' })} label="Back to Audience" />

      {/* Branch Progress - show when multiple segments selected */}
      <BranchProgress branches={state.audienceBranches} currentIndex={state.currentBranchIndex} />

      {/* Header */}
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
          style={{
            backgroundColor: 'var(--expedia-navy)',
            color: 'white',
            opacity: 0.85,
          }}
        >
          Gate 2: Step 3
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          {currentBranch ? `Insights for ${currentBranch.segment.name}` : 'Select Audience Insights'}
        </h2>
        <p className="text-[var(--text-secondary)]">
          12 insights ranging from bolder to safer. Select up to 3 that resonate with your audience.
        </p>
      </div>

      {/* Selection count indicator */}
      <div className={`p-3 rounded-lg text-center ${
        state.selectedInsights.length === 3
          ? 'bg-[var(--status-green)]/10 border border-[var(--status-green)]'
          : 'bg-[var(--bg-secondary)]'
      }`}>
        <span className="text-sm font-medium">
          {state.selectedInsights.length}/3 insights selected
        </span>
        {state.selectedInsights.length === 3 && (
          <span className="text-sm text-[var(--status-green)] ml-2">Maximum reached</span>
        )}
      </div>

      {/* Good Example */}
      <GoodExamplePrompt sectionKey="audience_insights" />

      {(['bolder', 'sharper', 'safer'] as const).map((level) => (
        <div key={level} className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: levelLabels[level].color }}
            />
            <span className="font-semibold text-[var(--text-primary)]">
              {levelLabels[level].label}
            </span>
            <span className="text-sm text-[var(--text-muted)]">— {levelLabels[level].desc}</span>
          </div>
          <div className="space-y-2 pl-6">
            {insightsByLevel[level].map((insight) => {
              const isSelected = state.selectedInsights.some((t) => t.id === insight.id);
              const isDisabled = !isSelected && state.selectedInsights.length >= 3;
              return (
                <div
                  key={insight.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5'
                      : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'
                  }`}
                  onClick={() => !isDisabled && toggleInsight(insight)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => toggleInsight(insight)}
                    className="mt-1 h-4 w-4 accent-[var(--expedia-navy)]"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={insight.text}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateInsightText(insight.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-transparent text-sm text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
        <span className="text-sm text-[var(--text-muted)]">
          {state.selectedInsights.length} selected (max 3)
        </span>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateInsights}
            disabled={state.loading}
            className="btn-outline text-sm px-5 py-2.5"
          >
            Regenerate
          </button>
          <button
            onClick={() => {
              // Push current state to history before confirming insights
              pushHistory('Confirm audience insights', {
                sections: [...state.sections],
                selectedInsights: [...state.selectedInsights],
                audienceBranches: [...state.audienceBranches],
              });

              // Save insights to current branch
              const updatedBranches = [...state.audienceBranches];
              if (updatedBranches[state.currentBranchIndex]) {
                updatedBranches[state.currentBranchIndex] = {
                  ...updatedBranches[state.currentBranchIndex],
                  insights: [...state.selectedInsights],
                };
              }

              // Check if there are more branches to process
              const nextBranchIndex = state.currentBranchIndex + 1;
              const hasMoreBranches = nextBranchIndex < state.audienceBranches.length;

              if (hasMoreBranches) {
                // Move to next branch - go back to audience step for personification
                const nextBranch = state.audienceBranches[nextBranchIndex];
                updateState({
                  audienceBranches: updatedBranches,
                  currentBranchIndex: nextBranchIndex,
                  selectedAudienceSegment: nextBranch.segment,
                  personification: null, // Reset for new branch
                  insightOptions: [], // Reset for new branch
                  selectedInsights: [], // Reset for new branch
                  step: 'gate2_audience', // Go back to generate personification for next segment
                });
              } else {
                // All branches done - merge insights and proceed to tenets
                // Collect all insights from all branches
                const allInsights = updatedBranches.flatMap(b => b.insights);

                // Update the audience_insights section
                const updatedSections = [...state.sections];
                const insightsIndex = updatedSections.findIndex((s) => s.key === 'audience_insights');
                if (insightsIndex >= 0) {
                  // Group insights by audience if multiple branches
                  let content = '';
                  if (updatedBranches.length > 1) {
                    content = updatedBranches.map(branch => {
                      const branchInsights = branch.insights.map((t) => `- ${t.text}`).join('\n');
                      return `**${branch.segment.name}:**\n${branchInsights}`;
                    }).join('\n\n');
                  } else {
                    content = allInsights.map((t) => `- ${t.text}`).join('\n');
                  }
                  updatedSections[insightsIndex] = {
                    ...updatedSections[insightsIndex],
                    status: 'green',
                    content,
                  };
                }

                // Update audience section with all audiences
                const audienceIndex = updatedSections.findIndex((s) => s.key === 'audience');
                if (audienceIndex >= 0) {
                  let audienceContent = '';
                  if (updatedBranches.length > 1) {
                    audienceContent = updatedBranches.map(branch => {
                      return `**${branch.segment.name}**\n${branch.segment.needsValues}\n\n${branch.personification?.narrative || ''}`;
                    }).join('\n\n---\n\n');
                  } else if (state.selectedAudienceSegment) {
                    audienceContent = `**${state.selectedAudienceSegment.name}**\n\n${state.selectedAudienceSegment.needsValues}\n\n${state.personification?.narrative || ''}`;
                  }
                  updatedSections[audienceIndex] = {
                    ...updatedSections[audienceIndex],
                    status: 'green',
                    content: audienceContent,
                  };
                }

                updateState({
                  sections: updatedSections,
                  audienceBranches: updatedBranches,
                  selectedInsights: allInsights, // Keep all for tenets generation
                });
                // Route through the handler: persists insights to the current
                // branch, derives partnerType/productionBudgetUsd, advances to
                // vault_decision, and fires the background matcher.
                handleConfirmInsights();
              }
            }}
            disabled={state.selectedInsights.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            {state.currentBranchIndex < state.audienceBranches.length - 1 && state.audienceBranches.length > 1
              ? `Confirm & Next Audience`
              : 'Confirm & Continue'}
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
