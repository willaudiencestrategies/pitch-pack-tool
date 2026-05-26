'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';

export function VaultExportStep() {
  const { state, handlers, updateState } = useBriefState();
  const result = state.vaultResult;
  const exported = !!result?.exportedAt;
  const conceptCount = result?.selectedConceptIds.length || 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => updateState({ step: 'vault_narrative_draft' })}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
      >
        ← Back to draft
      </button>

      {/* Header */}
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
          style={{ backgroundColor: 'var(--expedia-navy)', color: 'white', opacity: 0.85 }}
        >
          Vault: Export
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Brief Pack Ready
        </h2>
        <p className="text-[var(--text-secondary)]">
          Export your pitch-ready package for the seller to take into the client meeting.
        </p>
      </div>

      {/* Pack contents summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Pack Contents
        </h3>
        <div
          className="p-4 rounded-xl border space-y-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-start gap-3 text-sm">
            <span className="text-[var(--status-green)] font-bold flex-shrink-0">✓</span>
            <span className="text-[var(--text-primary)]">Matches summary — all {result?.rankedConcepts.length || 0} ranked concepts with confidence labels</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-[var(--status-green)] font-bold flex-shrink-0">✓</span>
            <span className="text-[var(--text-primary)]">Six-slide draft × {conceptCount} concept{conceptCount === 1 ? '' : 's'}</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-[var(--status-green)] font-bold flex-shrink-0">✓</span>
            <span className="text-[var(--text-primary)]">Reference materials and production parameters</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-[var(--status-green)] font-bold flex-shrink-0">✓</span>
            <span className="text-[var(--text-primary)]">Resume link for client rejection loopback</span>
          </div>
        </div>
      </div>

      {/* Success state or action */}
      {exported ? (
        <div
          className="p-4 rounded-xl border-2 flex items-start gap-3"
          style={{
            borderColor: 'var(--status-green)',
            backgroundColor: 'var(--status-green-bg)',
          }}
        >
          <div className="w-8 h-8 rounded-full bg-[var(--status-green)] text-white flex items-center justify-center font-bold flex-shrink-0">
            ✓
          </div>
          <div className="flex-1">
            <p className="font-medium text-[var(--text-primary)]">Pack exported</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Check your downloads folder for the <strong>.docx</strong> file. The resume link at the bottom of the pack lets the CP return to the tool if the buying client rejects the concept.
            </p>
          </div>
        </div>
      ) : (
        <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-3">
          <button
            onClick={() => handlers.handleVaultExport()}
            className="btn-secondary flex items-center gap-2"
          >
            <span>Export pitch pack (.docx)</span>
            <span>↓</span>
          </button>
          <button
            onClick={() => updateState({ step: 'vault_narrative_draft' })}
            className="btn-outline"
          >
            ← Back to draft
          </button>
        </div>
      )}
    </div>
  );
}
