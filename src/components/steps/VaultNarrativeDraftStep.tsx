'use client';

import { useState } from 'react';
import { useBriefState } from '@/lib/state/BriefStateContext';
import { NarrativeDraft } from '@/lib/types';

const SLIDE_LABELS: { key: keyof NarrativeDraft['slides']; label: string }[] = [
  { key: 'keyBriefPoints', label: 'Slide 1: Key Brief Points' },
  { key: 'creativeProblemWeAreSolving', label: 'Slide 2: Creative Problem We&apos;re Solving' },
  { key: 'narrativePitch', label: 'Slide 3: Narrative Pitch' },
  { key: 'conceptDescriptionFull', label: 'Slide 4: Concept Description (Full)' },
  { key: 'tailoringTo', label: 'Slide 5: Tailoring' },
  { key: 'strategicFitAndBudget', label: 'Slide 6: Strategic Fit & Budget' },
];

export function VaultNarrativeDraftStep() {
  const { state, updateState } = useBriefState();
  const result = state.vaultResult;
  const [activeConceptId, setActiveConceptId] = useState<string | null>(
    result?.selectedConceptIds[0] || null
  );

  if (state.loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p>
          Generating narrative draft
          {result && result.selectedConceptIds.length > 1 ? 's' : ''}...
        </p>
      </div>
    );
  }

  if (!result || !activeConceptId) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p>No drafts to show. Please go back and select at least one concept.</p>
      </div>
    );
  }

  const draft = result.narrativeDrafts[activeConceptId];
  if (!draft) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p>Draft for {activeConceptId} not yet generated.</p>
      </div>
    );
  }

  const updateSlide = (slideKey: keyof NarrativeDraft['slides'], content: string) => {
    if (!result) return;
    const updatedDrafts = {
      ...result.narrativeDrafts,
      [activeConceptId]: {
        ...draft,
        slides: { ...draft.slides, [slideKey]: content },
      },
    };
    updateState({
      vaultResult: { ...result, narrativeDrafts: updatedDrafts },
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-semibold mb-2">Narrative Draft</h2>

      {/* Tabs for multiple selected concepts */}
      {result.selectedConceptIds.length > 1 && (
        <div className="flex gap-2 border-b border-[var(--border-color)] mb-6">
          {result.selectedConceptIds.map(id => {
            const m = result.rankedConcepts.find(r => r.conceptId === id);
            return (
              <button
                key={id}
                onClick={() => setActiveConceptId(id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeConceptId === id
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

      <div className="space-y-6">
        {SLIDE_LABELS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-semibold mb-2">{label}</label>
            <textarea
              value={draft.slides[key]}
              onChange={(e) => updateSlide(key, e.target.value)}
              className="w-full min-h-[120px] px-3 py-2 border border-[var(--border-color)] rounded-lg focus:border-[var(--expedia-navy)] focus:outline-none resize-y"
              style={{ resize: 'vertical' }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => updateState({ step: 'vault_matches' })}
          className="px-6 py-3 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-tertiary)]"
        >
          Back to matches
        </button>
        <button
          onClick={() => updateState({ step: 'vault_export' })}
          className="flex-1 py-3 bg-[var(--expedia-navy)] text-white rounded-lg font-medium"
        >
          Export pitch pack
        </button>
      </div>
    </div>
  );
}
