'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { GoodExamplePrompt } from '@/components/GoodExamplePrompt';

export function MediaContextStep() {
  const { state, updateState } = useBriefState();

  // Get the media_context section
  const mediaSection = state.sections.find((s) => s.key === 'media_context');

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => updateState({ step: 'gate2_tenets' })}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
      >
        ← Back to Tenets
      </button>

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
          Gate 2: Step 5
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Media Context
        </h2>
        <p className="text-[var(--text-secondary)]">
          Add any media context the CP has provided. This is not AI-generated.
        </p>
      </div>

      {/* Good Example */}
      <GoodExamplePrompt sectionKey="media_context" />

      {/* Media Context Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Media Context
        </label>
        <textarea
          aria-label="Media context"
          className="textarea-field"
          style={{ minHeight: '180px' }}
          placeholder="Enter any media context provided by the CP (channels, timing, markets, DG match details)..."
          value={mediaSection?.content || ''}
          onChange={(e) => {
            const updatedSections = [...state.sections];
            const mediaIndex = updatedSections.findIndex((s) => s.key === 'media_context');
            if (mediaIndex >= 0) {
              updatedSections[mediaIndex] = {
                ...updatedSections[mediaIndex],
                content: e.target.value,
                status: e.target.value.trim() ? 'green' : 'amber',
              };
              updateState({ sections: updatedSections });
            }
          }}
        />
        <p className="text-xs text-[var(--text-muted)]">
          This section captures what the CP knows about media direction. It's not a detailed media plan.
        </p>
      </div>

      {/* Research Stimuli Toggle */}
      <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="pt-0.5">
            <input
              type="checkbox"
              checked={state.includeResearchStimuli}
              onChange={(e) => updateState({ includeResearchStimuli: e.target.checked })}
              className="h-5 w-5 rounded border-[var(--border-color)] accent-[var(--expedia-navy)] cursor-pointer"
            />
          </div>
          <div>
            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--expedia-navy)] transition-colors">
              Include Research Stimuli
            </span>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Include any URLs and research materials extracted from the brief as an appendix.
            </p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex gap-3">
        <button
          onClick={() => updateState({ step: 'output', currentGate: 'output' })}
          className="btn-secondary flex items-center gap-2"
        >
          <span>Finish & Generate Output</span>
          <span>→</span>
        </button>
        <button
          onClick={() => updateState({ step: 'gate2_tenets' })}
          className="btn-outline"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
