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
    <CreativeTenets
      audience={state.selectedAudienceSegment}
      insights={state.selectedInsights}
      onConfirm={handleConfirmTenets}
      onBack={() => updateState({ step: 'gate2_insights' })}
      onGenerate={handleGenerateTenets}
      loading={state.loading}
    />
  );
}
