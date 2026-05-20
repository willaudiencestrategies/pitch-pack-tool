'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { BrandAlignment } from '@/components/BrandAlignment';
import { ReturnToOutputButton } from '@/components/steps/shared/ReturnToOutputButton';

export function BrandAlignmentStep() {
  const { state, updateState, handlers } = useBriefState();

  return (
    <div className="space-y-4">
      {state.hasReachedOutput && (
        <div className="flex justify-end">
          <ReturnToOutputButton />
        </div>
      )}
      <BrandAlignment
        onConfirm={handlers.handleBrandAlignment}
        onBrandContent={(content) => {
          const updatedSections = [...state.sections];
          const brandIdx = updatedSections.findIndex((s) => s.key === 'brand_alignment');
          if (brandIdx >= 0) {
            updatedSections[brandIdx] = {
              ...updatedSections[brandIdx],
              content,
              status: 'green',
            };
            updateState({ sections: updatedSections });
          }
        }}
        onBack={() => updateState({ step: 'gate_transition' })}
        initialValue={state.brandAlignment}
        briefAudienceContent={
          state.triageResult?.triageAssessment.find((s) => s.key === 'audience')?.synthesizedContent || ''
        }
        briefObjectiveContent={
          state.triageResult?.triageAssessment.find((s) => s.key === 'objective')?.synthesizedContent || ''
        }
      />
    </div>
  );
}
