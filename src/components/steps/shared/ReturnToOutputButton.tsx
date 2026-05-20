'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';

export function ReturnToOutputButton() {
  const { state, updateState } = useBriefState();
  if (!state.hasReachedOutput || state.step === 'output') return null;
  return (
    <button
      onClick={() => updateState({ step: 'output', currentGate: 'output' })}
      className="text-sm text-[var(--expedia-navy)] hover:text-[var(--expedia-navy-dark)] font-medium flex items-center gap-1 transition-colors"
    >
      Return to Output →
    </button>
  );
}
