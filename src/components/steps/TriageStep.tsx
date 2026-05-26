'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { GATE1_SECTION_KEYS, CoherenceTension } from '@/lib/types';
import { BackButton } from '@/components/steps/shared/BackButton';
import { StatusBadge } from '@/components/steps/shared/StatusBadge';
import { Spinner } from '@/components/steps/shared/Spinner';
import { ReassessConfirmation } from '@/components/steps/shared/ReassessConfirmation';
import { ReturnToOutputButton } from '@/components/steps/shared/ReturnToOutputButton';

export function TriageStep() {
  const { state, updateState, handlers } = useBriefState();
  const { handleTriageReassess } = handlers;

  // Filter to only Gate 1 sections for triage display
  const gate1Sections = state.sections.filter((s) =>
    GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
  );

  // Calculate recommendation based on Gate 1 section statuses only
  const redSections = gate1Sections.filter((s) => s.status === 'red');
  const amberSections = gate1Sections.filter((s) => s.status === 'amber');
  const greenSections = gate1Sections.filter((s) => s.status === 'green');

  let recommendation = '';
  let recommendationPriority: 'red' | 'amber' | 'green' = 'green';

  if (redSections.length > 0) {
    recommendationPriority = 'red';
    if (redSections.length === 1) {
      recommendation = `Critical gap: ${redSections[0].name} is missing. ${redSections[0].feedback || 'This section needs content before proceeding.'}`;
    } else {
      recommendation = `Critical gaps in ${redSections.length} sections: ${redSections.map((s) => s.name).join(', ')}. Consider gathering more information on these before continuing.`;
    }
  } else if (amberSections.length > 0) {
    recommendationPriority = 'amber';
    recommendation = `${amberSections.length} section${amberSections.length > 1 ? 's need' : ' needs'} improvement: ${amberSections.map((s) => s.name).join(', ')}. Adding more detail will strengthen your Brief Pack.`;
  } else {
    recommendationPriority = 'green';
    recommendation = `Your brief covers the core Gate 1 sections well. You can still refine each section as you go through.`;
  }

  return (
    <div className="space-y-6" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <BackButton onClick={() => updateState({ step: 'tell_me_more' })} label="Back to Context" />
        <ReturnToOutputButton />
      </div>

      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        {/* Gate 1 Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
          style={{ backgroundColor: 'var(--expedia-navy)', color: 'white', opacity: 0.85 }}
        >
          Gate 1
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Brief Assessment
        </h2>
        <p className="text-[var(--text-secondary)]">
          Here's my review of the core brief elements. We'll build the creative brief in Gate 2.
        </p>
      </div>

      {/* Coherence Analysis Panel */}
      {state.triageResult &&
        state.triageResult.coherenceAnalysis &&
        state.triageResult.coherenceAnalysis.tensions &&
        state.triageResult.coherenceAnalysis.tensions.length > 0 && (() => {
          const { coherenceAnalysis } = state.triageResult;
          return (
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                borderColor: 'var(--border-color)',
                borderLeftWidth: '4px',
                borderLeftColor:
                  coherenceAnalysis.overallCoherence === 'coherent'
                    ? 'var(--status-green)'
                    : coherenceAnalysis.overallCoherence === 'incoherent'
                      ? 'var(--status-red)'
                      : 'var(--status-amber)',
              }}
            >
              <div className="p-4">
                <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Brief Coherence
                </h3>
                <div className="space-y-3">
                  {coherenceAnalysis.tensions.map((tension: CoherenceTension, idx: number) => (
                    <div key={idx} className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[var(--text-primary)]">
                          {tension.title}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                          {tension.description}
                        </p>
                      </div>
                      <span
                        className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            tension.severity === 'critical'
                              ? 'var(--status-red-bg)'
                              : 'var(--status-amber-bg, rgba(245, 158, 11, 0.1))',
                          color:
                            tension.severity === 'critical'
                              ? 'var(--status-red)'
                              : 'var(--status-amber)',
                        }}
                      >
                        {tension.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

      <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
        {gate1Sections.map((section, index) => {
          return (
            <div key={section.key}>
              <div
                onClick={() => updateState({ step: 'gate1_sections', currentSectionIndex: index, currentGate: 'gate1' })}
                className={`flex items-center justify-between p-4 transition-all cursor-pointer hover:bg-[var(--bg-secondary)] group ${
                  index !== gate1Sections.length - 1 ? 'border-b border-[var(--border-color)]' : ''
                }`}
                style={{
                  animation: 'fadeSlideIn 0.3s ease-out forwards',
                  animationDelay: `${index * 80}ms`,
                  opacity: 0,
                }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: 'var(--expedia-navy)', color: 'white' }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium text-[var(--text-primary)] group-hover:underline">{section.name}</span>
                    <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to edit this section
                    </span>
                  </div>
                </div>
                <StatusBadge status={section.status} />
              </div>

              {index !== gate1Sections.length - 1 && (
                <div className="border-b border-[var(--border-color)]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Recommendation Summary */}
      <div className={`p-4 rounded-xl border-l-4 ${
        recommendationPriority === 'red'
          ? 'bg-[var(--status-red-bg)] border-[var(--status-red)]'
          : recommendationPriority === 'amber'
          ? 'bg-[var(--status-amber)]/10 border-[var(--status-amber)]'
          : 'bg-[var(--status-green)]/10 border-[var(--status-green)]'
      }`}>
        <p className="font-medium text-[var(--text-primary)] mb-1">
          {recommendationPriority === 'red' ? '⚠️ Recommendation' :
           recommendationPriority === 'amber' ? '💡 Recommendation' : '✓ Looking Good'}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">{recommendation}</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          {greenSections.length} good · {amberSections.length} needs work · {redSections.length} missing
        </p>
      </div>

      <div className="p-5 rounded-xl bg-[var(--bg-secondary)]">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Before we continue, gather more context
        </label>
        <div className="text-sm text-[var(--text-muted)] mb-4 space-y-2">
          <p>To get the best results, consider checking:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>The destination's official website and YouTube channel</li>
            <li>Recent press releases or news articles</li>
            <li>Competitor campaigns or positioning</li>
            <li>Any existing research or customer insights</li>
            <li>Previous campaign materials or brand guidelines</li>
          </ul>
          <p className="pt-2">Paste anything useful below:</p>
        </div>
        <textarea
          aria-label="Additional context for the brief"
          className="textarea-field"
          style={{ minHeight: '140px' }}
          placeholder="Paste any additional context here (optional)..."
          value={state.additionalContext}
          onChange={(e) => updateState({ additionalContext: e.target.value })}
        />

        {/* Reassess Button */}
        <button
          onClick={handleTriageReassess}
          disabled={!state.additionalContext.trim() || state.loading}
          className="btn-primary flex items-center gap-2 mt-4"
        >
          {state.loading ? (
            <Spinner className="text-white" />
          ) : (
            <span>🔄</span>
          )}
          Reassess with New Context
        </button>

        {/* Reassess Confirmation */}
        <ReassessConfirmation count={state.reassessCount} />
      </div>

      <button
        onClick={() => updateState({ step: 'gate1_sections', currentSectionIndex: 0, currentGate: 'gate1' })}
        className="btn-secondary flex items-center gap-2 w-full justify-center"
      >
        Review Gate 1 Sections
        <span>→</span>
      </button>
    </div>
  );
}
