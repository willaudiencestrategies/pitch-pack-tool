'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { LoadingProgress } from '@/components/LoadingProgress';
import { TRIAGE_STAGES } from '@/lib/loading-config';
import { BackButton } from '@/components/steps/shared/BackButton';

export function TellMeMoreStep() {
  const { state, updateState, handlers, progress } = useBriefState();
  const { handleTriage } = handlers;
  const triageProgress = progress.triage;

  if (state.loading && triageProgress.isActive) {
    return (
      <LoadingProgress
        stages={TRIAGE_STAGES}
        currentStageIndex={triageProgress.currentStageIndex}
        showTips={true}
      />
    );
  }

  const handleAssessBrief = () => {
    // Merge preTellMeMoreContext into additionalContext before triage
    if (state.preTellMeMoreContext.trim()) {
      updateState({
        additionalContext: state.additionalContext
          ? state.additionalContext + '\n\n' + state.preTellMeMoreContext
          : state.preTellMeMoreContext,
      });
    }
    handleTriage();
  };

  return (
    <div className="space-y-6" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
      {/* Back Button */}
      <BackButton onClick={() => updateState({ step: 'upload' })} label="Back to Upload" />

      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          So, tell me more...
        </h2>
        <p className="text-[var(--text-secondary)]">
          Got any call notes, email threads, or seller conversations? Paste them here — they'll help me understand the brief better.
        </p>
      </div>

      {/* Context Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Additional Context
        </label>
        <textarea
          aria-label="Additional context from calls, emails, or conversations"
          className="textarea-field"
          style={{ minHeight: '200px' }}
          placeholder="Paste any relevant context here... call notes, email threads, Slack messages, seller conversations, etc."
          value={state.preTellMeMoreContext}
          onChange={(e) => updateState({ preTellMeMoreContext: e.target.value })}
        />
        <p className="text-xs text-[var(--text-muted)]">
          This context will be used alongside the brief to give you better assessments and suggestions.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-color)]">
        <button
          onClick={handleAssessBrief}
          className="btn-secondary flex items-center gap-2 w-full justify-center"
        >
          Assess Brief →
        </button>
        <button
          onClick={() => handleTriage()}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] text-center transition-colors"
        >
          Skip for now
        </button>
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
