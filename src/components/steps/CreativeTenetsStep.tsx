'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { CreativeTenets } from '@/components/CreativeTenets';

export function CreativeTenetsStep() {
  const { state, updateState, handlers } = useBriefState();
  const { handleGenerateTenets, handleConfirmTenets } = handlers;

  if (!state.selectedAudienceSegment || state.selectedInsights.length === 0) {
    // Redirect back to insights if missing required data
    updateState({ step: 'gate2_insights' });
    return null;
  }

  return (
    <>
      {state.resumedFromToken && state.vaultResult && (
        <div className="bg-[var(--bg-tertiary)] border-l-4 border-[var(--status-amber)] p-4 mb-6 rounded">
          <div className="font-medium mb-1">Returning from a Vault attempt</div>
          <div className="text-sm text-[var(--text-muted)]">
            The buying client didn&apos;t go for the Vault concept. Earlier matches surfaced:{' '}
            {state.vaultResult.rankedConcepts.map((m) => m.conceptName).join(', ')}.
            Continuing through Creative Tenets for net-new ideation.
          </div>
        </div>
      )}
      <CreativeTenets
        audience={state.selectedAudienceSegment}
        insights={state.selectedInsights}
        onConfirm={handleConfirmTenets}
        onBack={() => updateState({ step: 'gate2_insights' })}
        onGenerate={handleGenerateTenets}
        loading={state.loading}
      />
    </>
  );
}
