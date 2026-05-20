'use client';

import { useState } from 'react';
import { useBriefState } from '@/lib/state/BriefStateContext';
import { NarrativeDraft } from '@/lib/types';

const SLIDE_LABELS: { key: keyof NarrativeDraft['slides']; label: string; hint: string }[] = [
  { key: 'keyBriefPoints', label: 'Slide 1: Key Brief Points', hint: 'Strategic inputs + CBT triage traffic lights' },
  { key: 'creativeProblemWeAreSolving', label: 'Slide 2: Creative Problem', hint: 'The brief reframed as a creative challenge' },
  { key: 'narrativePitch', label: 'Slide 3: Narrative Pitch', hint: 'Presentation-ready story copy' },
  { key: 'conceptDescriptionFull', label: 'Slide 4: Concept Description (Full)', hint: 'Verbatim from vault + deployment examples' },
  { key: 'tailoringTo', label: 'Slide 5: Tailoring', hint: 'Allowed: destination, culture, atmosphere. Forbidden: new mechanics, channels' },
  { key: 'strategicFitAndBudget', label: 'Slide 6: Strategic Fit & Budget', hint: 'Rationale, watchouts, verbatim timeline + budget' },
];

export function VaultNarrativeDraftStep() {
  const { state, updateState } = useBriefState();
  const result = state.vaultResult;
  const [activeConceptId, setActiveConceptId] = useState<string | null>(
    result?.selectedConceptIds[0] || null
  );

  // Loading state
  if (state.loading) {
    return (
      <div className="space-y-6">
        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
            style={{ backgroundColor: 'var(--expedia-navy)', color: 'white', opacity: 0.85 }}
          >
            Vault: Narrative Draft
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Generating draft...</h2>
          <p className="text-[var(--text-secondary)]">
            Building six-slide pitch{result && result.selectedConceptIds.length > 1 ? 'es' : ''} for {result?.selectedConceptIds.length || 0} concept{result && result.selectedConceptIds.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>
    );
  }

  // Empty / error states
  if (!result || !activeConceptId) {
    return (
      <div className="space-y-6">
        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">No drafts available</h2>
          <p className="text-[var(--text-secondary)]">Go back and select at least one concept.</p>
        </div>
        <div className="pt-4 border-t border-[var(--border-color)] flex gap-3">
          <button onClick={() => updateState({ step: 'vault_matches' })} className="btn-outline">
            ← Back to matches
          </button>
        </div>
      </div>
    );
  }

  const draft = result.narrativeDrafts[activeConceptId];
  if (!draft) {
    return (
      <div className="space-y-6">
        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Draft pending</h2>
          <p className="text-[var(--text-secondary)]">
            Draft for {activeConceptId} hasn&apos;t been generated yet.
          </p>
        </div>
      </div>
    );
  }

  const activeMatch = result.rankedConcepts.find(r => r.conceptId === activeConceptId);

  const updateSlide = (slideKey: keyof NarrativeDraft['slides'], content: string) => {
    if (!result) return;
    const updatedDrafts = {
      ...result.narrativeDrafts,
      [activeConceptId]: {
        ...draft,
        slides: { ...draft.slides, [slideKey]: content },
      },
    };
    updateState({ vaultResult: { ...result, narrativeDrafts: updatedDrafts } });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => updateState({ step: 'vault_matches' })}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
      >
        ← Back to matches
      </button>

      {/* Header */}
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
          style={{ backgroundColor: 'var(--expedia-navy)', color: 'white', opacity: 0.85 }}
        >
          Vault: Narrative Draft
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          {activeMatch?.conceptName || 'Narrative Draft'}
        </h2>
        <p className="text-[var(--text-secondary)]">
          Review and edit the six slides before exporting your pitch pack.
        </p>
      </div>

      {/* Tabs for multiple selected concepts */}
      {result.selectedConceptIds.length > 1 && (
        <div className="flex gap-2 border-b border-[var(--border-color)] overflow-x-auto">
          {result.selectedConceptIds.map(id => {
            const m = result.rankedConcepts.find(r => r.conceptId === id);
            const isActive = activeConceptId === id;
            return (
              <button
                key={id}
                onClick={() => setActiveConceptId(id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[var(--expedia-navy)] text-[var(--expedia-navy)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m?.conceptName || id}
              </button>
            );
          })}
        </div>
      )}

      {/* Slide editors */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">Slides</h3>
          <span className="text-xs text-[var(--text-muted)]">Click any field to edit</span>
        </div>

        {SLIDE_LABELS.map(({ key, label, hint }) => (
          <div
            key={key}
            className="p-4 rounded-xl border transition-all hover:border-[var(--expedia-navy)]/50 hover:shadow-sm"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">{label}</label>
              <span className="text-xs text-[var(--text-muted)] italic">{hint}</span>
            </div>
            <textarea
              value={draft.slides[key]}
              onChange={(e) => updateSlide(key, e.target.value)}
              className="textarea-field"
              style={{ minHeight: '120px' }}
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-3">
        <button
          onClick={() => updateState({ step: 'vault_export' })}
          className="btn-secondary flex items-center gap-2"
        >
          <span>Export pitch pack</span>
          <span>→</span>
        </button>
        <button
          onClick={() => updateState({ step: 'vault_matches' })}
          className="btn-outline"
        >
          ← Back to matches
        </button>
      </div>
    </div>
  );
}
