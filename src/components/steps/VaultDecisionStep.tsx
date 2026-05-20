'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';

type SignalKey = 'strong' | 'plausible' | 'stretch' | 'none';

export function VaultDecisionStep() {
  const { state, handlers } = useBriefState();
  const preview = state.vaultMatchPreview;

  const signalCopy: Record<SignalKey, { title: string; subtitle: string; highlight: 'vault' | 'tenets' }> = {
    strong: {
      title: `${preview?.rankedCount || 0} strong matches in the Vault`,
      subtitle: preview?.topConceptName ? `Top: ${preview.topConceptName}. Take a look.` : 'Take a look.',
      highlight: 'vault',
    },
    plausible: {
      title: 'Some matches found',
      subtitle: 'Worth a quick scan before going to Creative Tenets.',
      highlight: 'vault',
    },
    stretch: {
      title: 'Closest fits found but nothing strong',
      subtitle: 'Worth a look, or route to Tenets for net-new ideation.',
      highlight: 'tenets',
    },
    none: {
      title: 'Vault has nothing close',
      subtitle: 'Recommend Creative Tenets.',
      highlight: 'tenets',
    },
  };

  const sig: SignalKey = preview?.signal ?? 'none';
  const copy = signalCopy[sig];

  const objective = state.sections.find(s => s.key === 'objective')?.content?.slice(0, 140) || '—';
  const audienceName = state.selectedAudienceSegment?.name || '—';
  const budgetDisplay = state.productionBudgetUsd
    ? `$${state.productionBudgetUsd.toLocaleString()}`
    : 'to be confirmed';

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-semibold mb-2 text-[var(--text-primary)]">
        Vault or Creative Tenets?
      </h2>
      <p className="text-[var(--text-muted)] mb-6">
        Before we go to Creative Tenets, the Vault might already have a validated concept that fits.
      </p>

      {/* Brief recap */}
      <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-6 text-sm">
        <div className="font-medium mb-1 text-[var(--text-primary)]">Brief recap</div>
        <div className="text-[var(--text-muted)] space-y-1">
          <div>Objective: {objective}</div>
          <div>Audience: {audienceName}</div>
          <div>Production budget: {budgetDisplay}</div>
        </div>
      </div>

      {/* Preview signal */}
      {!preview ? (
        <div className="text-sm text-[var(--text-muted)] mb-6">Checking the Vault...</div>
      ) : (
        <div
          className={`rounded-lg p-4 mb-6 border ${
            sig === 'strong'
              ? 'border-[var(--status-green)] bg-[var(--status-green)]/10'
              : sig === 'plausible'
              ? 'border-[var(--status-amber)] bg-[var(--status-amber)]/10'
              : sig === 'stretch'
              ? 'border-[var(--status-amber)] bg-[var(--status-amber)]/5'
              : 'border-[var(--border-color)] bg-[var(--bg-tertiary)]'
          }`}
        >
          <div className="font-medium text-[var(--text-primary)]">{copy.title}</div>
          <div className="text-sm text-[var(--text-muted)]">{copy.subtitle}</div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => handlers.handleVaultDecision('vault')}
          className={`flex-1 py-4 rounded-lg font-medium transition ${
            copy.highlight === 'vault'
              ? 'bg-[var(--expedia-navy)] text-white'
              : 'border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          Take to the Vault
        </button>
        <button
          onClick={() => handlers.handleVaultDecision('creative-lab')}
          className={`flex-1 py-4 rounded-lg font-medium transition ${
            copy.highlight === 'tenets'
              ? 'bg-[var(--expedia-navy)] text-white'
              : 'border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          Continue to Creative Tenets
        </button>
      </div>
    </div>
  );
}
