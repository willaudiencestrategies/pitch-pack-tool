'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';

export function VaultExportStep() {
  const { state, handlers } = useBriefState();
  const result = state.vaultResult;
  const exported = !!result?.exportedAt;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-semibold mb-2">Pitch Pack Ready</h2>
      <p className="text-[var(--text-muted)] mb-6">
        Your pitch pack contains the match summary, the six-slide draft for each selected
        concept, reference materials, and a resume link in case the buying client rejects
        the concept and you need to come back into the tool.
      </p>

      {!exported ? (
        <button
          onClick={() => handlers.handleVaultExport()}
          className="w-full py-3 bg-[var(--expedia-navy)] text-white rounded-lg font-medium"
        >
          Export pitch pack (.docx)
        </button>
      ) : (
        <div className="bg-[var(--status-green)]/10 border border-[var(--status-green)] rounded-lg p-4">
          <div className="font-medium">Pack exported.</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">Check your downloads folder for the .docx file.</div>
        </div>
      )}
    </div>
  );
}
