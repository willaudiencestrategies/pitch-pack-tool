'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { GATE1_SECTION_KEYS } from '@/lib/types';
import { GateTransition } from '@/components/GateTransition';

export function GateTransitionStep() {
  const { state, updateState } = useBriefState();

  return (
    <GateTransition
      sections={state.sections}
      onContinue={() => updateState({ step: 'gate2_brand', currentGate: 'gate2' })}
      onBack={() => {
        // Go back to last Gate 1 section
        const gate1Sections = state.sections.filter((s) =>
          GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
        );
        updateState({
          step: 'gate1_sections',
          currentSectionIndex: gate1Sections.length - 1,
        });
      }}
    />
  );
}
