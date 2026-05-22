'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { LoadingOverlay } from '@/components/steps/shared/LoadingOverlay';
import { VaultConceptMatch } from '@/lib/types';

const confidenceBadge: Record<string, { label: string; className: string }> = {
  strong: { label: 'Strong', className: 'status-badge status-green' },
  plausible: { label: 'Plausible', className: 'status-badge status-amber' },
  stretch: { label: 'Stretch', className: 'status-badge status-red' },
};

export function VaultMatchListStep() {
  const { state, handlers } = useBriefState();
  const result = state.vaultResult;
  const selected = result?.selectedConceptIds || [];

  if (state.loading && (!result || !result.rankedConcepts.length)) {
    return (
      <LoadingOverlay
        message="Searching the Vault..."
        subMessage="Matching your brief against 33 pre-developed concepts"
      />
    );
  }

  if (!result || !result.rankedConcepts.length) {
    return (
      <div className="space-y-6">
        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
            style={{ backgroundColor: 'var(--expedia-navy)', color: 'white', opacity: 0.85 }}
          >
            Vault: Matches
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">No matches</h2>
          <p className="text-[var(--text-secondary)]">
            The Vault didn&apos;t return any candidates. Try Creative Tenets instead.
          </p>
        </div>
        <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-3">
          <button
            onClick={() => handlers.handleVaultDecision('creative-lab')}
            className="btn-secondary flex items-center gap-2"
          >
            <span>Continue to Creative Tenets</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
          style={{ backgroundColor: 'var(--expedia-navy)', color: 'white', opacity: 0.85 }}
        >
          Vault: Matches
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          {result.rankedConcepts.length} ranked match{result.rankedConcepts.length === 1 ? '' : 'es'}
        </h2>
        <p className="text-[var(--text-secondary)]">
          Pick one or more concepts to expand into a six-slide pitch pack.
        </p>
      </div>

      {/* Top-line note (if all stretch) */}
      {result.topLineNote && (
        <div
          className="p-4 rounded-xl border-l-4 flex items-start gap-3"
          style={{
            backgroundColor: 'var(--status-amber-bg)',
            borderLeftColor: 'var(--status-amber)',
            borderTop: '1px solid var(--border-color)',
            borderRight: '1px solid var(--border-color)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div className="w-6 h-6 rounded-full bg-[var(--status-amber)] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            !
          </div>
          <p className="text-sm text-[var(--text-primary)]">{result.topLineNote}</p>
        </div>
      )}

      {/* Match cards */}
      <div className="space-y-3">
        {result.rankedConcepts.map((match) => (
          <MatchCard
            key={match.conceptId}
            match={match}
            selected={selected.includes(match.conceptId)}
            onToggle={() => handlers.handleVaultSelectConcept(match.conceptId)}
          />
        ))}
      </div>

      {/* Creative Lab reminder (Dave's required text) */}
      {selected.length > 0 && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--expedia-navy)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              i
            </div>
            <div className="flex-1">
              <p className="font-medium text-[var(--text-primary)] mb-1 text-sm">Creative Lab heads-up</p>
              <p className="text-sm text-[var(--text-secondary)]">
                It&apos;s great that you think there are some interesting options, but to be safe,
                please ensure you speak with the Creative Lab team before taking any of these
                concepts externally.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-3">
        <button
          onClick={() => handlers.handleVaultProceedToDraft()}
          disabled={selected.length === 0}
          className="btn-secondary flex items-center gap-2"
        >
          <span>Expand {selected.length || 'selected'} into pitch pack</span>
          <span>→</span>
        </button>
        <button
          onClick={() => handlers.handleVaultDecision('creative-lab')}
          className="btn-outline flex items-center gap-2"
        >
          <span>Continue to Creative Tenets instead</span>
        </button>
      </div>
    </div>
  );
}

function MatchCard({ match, selected, onToggle }: { match: VaultConceptMatch; selected: boolean; onToggle: () => void }) {
  const badge = confidenceBadge[match.confidence];
  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        selected
          ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5 shadow-md'
          : 'border-[var(--border-color)] hover:border-[var(--expedia-navy)]/50 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Slot badge */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold flex-shrink-0"
          style={{
            backgroundColor: selected ? 'var(--expedia-navy)' : 'var(--bg-tertiary)',
            color: selected ? 'white' : 'var(--text-primary)',
          }}
        >
          {match.slot}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: name + confidence badge */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className={`font-semibold text-lg ${selected ? 'text-[var(--expedia-navy)]' : 'text-[var(--text-primary)]'}`}>
              {match.conceptName}
            </h3>
            <span className={badge.className}>{badge.label}</span>
            {match.budgetFlag === 'close-to-edge' && (
              <span className="status-badge status-amber">Close to budget edge</span>
            )}
            {match.partnerTypeMatch === 'adjacent' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                Cross-category
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-3">
            {match.conceptDescription}
          </p>

          {/* Reason */}
          <p className="text-sm italic text-[var(--text-muted)] mb-3 leading-relaxed">
            &ldquo;{match.confidenceReason}&rdquo;
          </p>

          {/* Production timeline */}
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span>
              Timeline: <strong className="text-[var(--text-primary)]">{match.estimatedProductionTimeline || '—'}</strong>
            </span>
            {match.estimatedProductionBudget && (
              <span>
                Budget: <strong className="text-[var(--text-primary)]">{match.estimatedProductionBudget}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Selection indicator */}
        <div className="pt-0.5">
          <div
            className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selected
                ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]'
                : 'border-[var(--border-color)]'
            }`}
          >
            {selected && <span className="text-white text-xs font-bold">✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
