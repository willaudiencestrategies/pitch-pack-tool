'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';

export function VaultAudiencePickerStep() {
  const { state, handlers } = useBriefState();
  const branches = state.audienceBranches;
  const totalCombined = branches.flatMap(b => b.insights).length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-semibold mb-2 text-[var(--text-primary)]">
        Match against which audience?
      </h2>
      <p className="text-[var(--text-muted)] mb-6">
        You picked {branches.length} audiences. The Vault matcher needs to know
        which truths to weight. Pick one audience, or combine them all.
      </p>

      <div className="space-y-3">
        {branches.map((branch, idx) => (
          <button
            key={branch.segment.id}
            onClick={() => handlers.handleVaultAudiencePick(idx)}
            className="w-full text-left p-4 rounded-lg border border-[var(--border-color)] hover:border-[var(--expedia-navy)] hover:bg-[var(--bg-tertiary)] transition"
          >
            <div className="font-medium text-[var(--text-primary)]">
              {branch.segment.name}
            </div>
            <div className="text-sm text-[var(--text-muted)] mt-1">
              {branch.insights.length} insight
              {branch.insights.length === 1 ? '' : 's'} selected
            </div>
          </button>
        ))}

        <button
          onClick={() => handlers.handleVaultAudiencePick('all')}
          className="w-full text-left p-4 rounded-lg border-2 border-dashed border-[var(--border-color)] hover:border-[var(--expedia-navy)] hover:bg-[var(--bg-tertiary)] transition"
        >
          <div className="font-medium text-[var(--text-primary)]">All combined</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            Merge all {totalCombined} insights into one match call.
          </div>
        </button>
      </div>
    </div>
  );
}
