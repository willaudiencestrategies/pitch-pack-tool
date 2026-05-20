'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { VaultConceptMatch } from '@/lib/types';

const confidenceBadge: Record<string, { label: string; bg: string; text: string }> = {
  strong: { label: 'Strong', bg: 'bg-[var(--status-green)]/15', text: 'text-[var(--status-green)]' },
  plausible: { label: 'Plausible', bg: 'bg-[var(--status-amber)]/15', text: 'text-[var(--status-amber)]' },
  stretch: { label: 'Stretch', bg: 'bg-[var(--status-red)]/15', text: 'text-[var(--status-red)]' },
};

export function VaultMatchListStep() {
  const { state, handlers } = useBriefState();
  const result = state.vaultResult;
  const selected = result?.selectedConceptIds || [];

  if (!result || !result.rankedConcepts.length) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p>No matches available. Please go back and try Creative Tenets instead.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-semibold mb-2">Vault Matches</h2>

      {result.topLineNote && (
        <div className="bg-[var(--status-amber)]/10 border border-[var(--status-amber)] rounded-lg p-4 mb-6 text-sm">
          {result.topLineNote}
        </div>
      )}

      <div className="space-y-4 mb-6">
        {result.rankedConcepts.map((match) => (
          <MatchCard
            key={match.conceptId}
            match={match}
            selected={selected.includes(match.conceptId)}
            onToggle={() => handlers.handleVaultSelectConcept(match.conceptId)}
          />
        ))}
      </div>

      {/* Creative Lab reminder */}
      {selected.length > 0 && (
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-6 text-sm">
          <strong>Heads up:</strong> It&apos;s great that you think there are some interesting
          options, but to be safe, please ensure you speak with the Creative Lab team before
          taking any of these concepts externally.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handlers.handleVaultDecision('creative-lab')}
          className="px-6 py-3 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-tertiary)]"
        >
          Back to Creative Tenets instead
        </button>
        <button
          onClick={() => handlers.handleVaultProceedToDraft()}
          disabled={selected.length === 0}
          className="flex-1 py-3 bg-[var(--expedia-navy)] text-white rounded-lg font-medium disabled:opacity-50"
        >
          Expand {selected.length} selected concept{selected.length === 1 ? '' : 's'} into a pitch pack
        </button>
      </div>
    </div>
  );
}

function MatchCard({ match, selected, onToggle }: { match: VaultConceptMatch; selected: boolean; onToggle: () => void }) {
  const badge = confidenceBadge[match.confidence];
  return (
    <div className={`rounded-lg border p-5 ${selected ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5' : 'border-[var(--border-color)]'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-[var(--text-muted)]">Top Match {match.slot}</div>
          <div className={`text-xs px-2 py-0.5 rounded ${badge.bg} ${badge.text} font-medium`}>{badge.label}</div>
          {match.budgetFlag === 'close-to-edge' && (
            <div className="text-xs px-2 py-0.5 rounded bg-[var(--status-amber)]/15 text-[var(--status-amber)]">Close to budget edge</div>
          )}
          {match.partnerTypeMatch === 'adjacent' && (
            <div className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">Cross-category</div>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`text-sm px-3 py-1 rounded ${selected ? 'bg-[var(--expedia-navy)] text-white' : 'border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'}`}
        >
          {selected ? '✓ Selected' : 'Select'}
        </button>
      </div>
      <h3 className="text-lg font-semibold mb-2">{match.conceptName}</h3>
      <p className="text-sm text-[var(--text-muted)] mb-3">{match.conceptDescription}</p>
      <div className="text-sm italic text-[var(--text-muted)] mb-3">{match.confidenceReason}</div>
      <div className="text-xs text-[var(--text-muted)]">
        Production timeline: <span className="font-medium">{match.estimatedProductionTimeline}</span>
      </div>
    </div>
  );
}
