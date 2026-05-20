'use client';

import { useState } from 'react';
import { useBriefState } from '@/lib/state/BriefStateContext';

export function VaultAudiencePickerStep() {
  const { state, handlers } = useBriefState();
  const branches = state.audienceBranches;
  const [selected, setSelected] = useState<number | 'all' | null>(null);
  const totalCombined = branches.flatMap(b => b.insights).length;

  const isSelected = (key: number | 'all') => selected === key;

  const confirm = () => {
    if (selected === null) return;
    handlers.handleVaultAudiencePick(selected);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => state && handlers.handleVaultDecision('creative-lab')}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
      >
        ← Back
      </button>

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
          Vault: Audience Pick
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Match against which audience?
        </h2>
        <p className="text-[var(--text-secondary)]">
          You picked {branches.length} audiences. Pick one, or merge them all.
        </p>
      </div>

      {/* Audience cards */}
      <div className="space-y-3">
        {branches.map((branch, idx) => {
          const sel = isSelected(idx);
          return (
            <div
              key={branch.segment.id}
              onClick={() => setSelected(idx)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                sel
                  ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5 shadow-md'
                  : 'border-[var(--border-color)] hover:border-[var(--expedia-navy)]/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Radio indicator */}
                <div className="pt-0.5">
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      sel
                        ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]'
                        : 'border-[var(--border-color)]'
                    }`}
                  >
                    {sel && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg mb-1 ${
                    sel ? 'text-[var(--expedia-navy)]' : 'text-[var(--text-primary)]'
                  }`}>
                    {idx === 0 ? '★ Primary: ' : 'Secondary: '}{branch.segment.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-2">
                    {branch.segment.needsValues}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                    {branch.insights.length} insight{branch.insights.length === 1 ? '' : 's'} selected
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* All combined */}
        <div
          onClick={() => setSelected('all')}
          className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
            isSelected('all')
              ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5 shadow-md'
              : 'border-[var(--border-color)] hover:border-[var(--expedia-navy)]/50 hover:shadow-sm'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected('all')
                    ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]'
                    : 'border-[var(--border-color)]'
                }`}
              >
                {isSelected('all') && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-lg mb-1 ${
                isSelected('all') ? 'text-[var(--expedia-navy)]' : 'text-[var(--text-primary)]'
              }`}>
                All combined
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Merge truths from every audience into one match call.
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                {totalCombined} insights combined
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-3">
        <button
          onClick={confirm}
          disabled={selected === null}
          className="btn-secondary flex items-center gap-2"
        >
          <span>Confirm & Find Matches</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
