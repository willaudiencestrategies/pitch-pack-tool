'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';

type SignalKey = 'strong' | 'plausible' | 'stretch' | 'none';

const signalStyles: Record<SignalKey, { borderColor: string; iconBg: string; icon: string }> = {
  strong: { borderColor: 'var(--status-green)', iconBg: 'var(--status-green-bg)', icon: '✓' },
  plausible: { borderColor: 'var(--status-amber)', iconBg: 'var(--status-amber-bg)', icon: '~' },
  stretch: { borderColor: 'var(--status-amber)', iconBg: 'var(--status-amber-bg)', icon: '!' },
  none: { borderColor: 'var(--border-color)', iconBg: 'var(--bg-tertiary)', icon: '·' },
};

export function VaultDecisionStep() {
  const { state, handlers } = useBriefState();
  const preview = state.vaultMatchPreview;

  const signalCopy: Record<SignalKey, { title: string; subtitle: string; highlight: 'vault' | 'tenets' }> = {
    strong: {
      title: `${preview?.rankedCount ?? 0} strong matches in the Vault`,
      subtitle: preview?.topConceptName ? `Top: ${preview.topConceptName}. Take a look.` : 'Take a look.',
      highlight: 'vault',
    },
    plausible: {
      title: 'Some matches worth a scan',
      subtitle: 'Plausible fits surfaced. Worth reviewing before going to Creative Tenets.',
      highlight: 'vault',
    },
    stretch: {
      title: 'Closest fits found but nothing strong',
      subtitle: 'You can still review them, or route to Tenets for net-new ideation.',
      highlight: 'tenets',
    },
    none: {
      title: 'Vault has nothing close',
      subtitle: 'Recommend Creative Tenets for net-new ideation.',
      highlight: 'tenets',
    },
  };

  const sig: SignalKey = preview?.signal ?? 'none';
  const copy = signalCopy[sig];
  const style = signalStyles[sig];

  const objective = state.sections.find(s => s.key === 'objective')?.content?.slice(0, 200) || '—';
  const audienceName = state.selectedAudienceSegment?.name || '—';
  const budgetDisplay = state.productionBudgetUsd
    ? `$${state.productionBudgetUsd.toLocaleString()}`
    : 'to be confirmed';

  return (
    <div className="space-y-6">
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
          Vault: Decision
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Vault or Creative Tenets?
        </h2>
        <p className="text-[var(--text-secondary)]">
          Before going to Creative Tenets, the Vault might already have a validated concept that fits.
        </p>
      </div>

      {/* Brief recap card */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Brief Recap
        </h3>
        <div
          className="p-4 rounded-xl border space-y-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xs font-semibold text-[var(--expedia-navy)] uppercase tracking-wide w-32 flex-shrink-0 pt-0.5">Objective</span>
            <p className="text-sm text-[var(--text-secondary)] flex-1 line-clamp-2">{objective}</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xs font-semibold text-[var(--expedia-navy)] uppercase tracking-wide w-32 flex-shrink-0 pt-0.5">Audience</span>
            <p className="text-sm text-[var(--text-secondary)] flex-1">{audienceName}</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xs font-semibold text-[var(--expedia-navy)] uppercase tracking-wide w-32 flex-shrink-0 pt-0.5">Production budget</span>
            <p className="text-sm text-[var(--text-secondary)] flex-1">{budgetDisplay}</p>
          </div>
        </div>
      </div>

      {/* Preview signal card */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Vault Match Preview
        </h3>
        {!preview ? (
          <div
            className="p-4 rounded-xl border flex items-center gap-3"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <LoadingSpinner />
            <span className="text-sm text-[var(--text-muted)]">Checking the Vault...</span>
          </div>
        ) : (
          <div
            className="p-4 rounded-xl border-2 flex items-start gap-3"
            style={{
              borderColor: style.borderColor,
              backgroundColor: 'var(--bg-primary)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0"
              style={{
                backgroundColor: style.iconBg,
                color: style.borderColor,
              }}
            >
              {style.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text-primary)] mb-1">{copy.title}</p>
              <p className="text-sm text-[var(--text-secondary)]">{copy.subtitle}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-3">
        <button
          onClick={() => handlers.handleVaultDecision('vault')}
          className={copy.highlight === 'vault' ? 'btn-secondary flex items-center gap-2' : 'btn-outline flex items-center gap-2'}
        >
          <span>Take to the Vault</span>
          <span>→</span>
        </button>
        <button
          onClick={() => handlers.handleVaultDecision('creative-lab')}
          className={copy.highlight === 'tenets' ? 'btn-secondary flex items-center gap-2' : 'btn-outline flex items-center gap-2'}
        >
          <span>Continue to Creative Tenets</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-[var(--expedia-navy)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}
