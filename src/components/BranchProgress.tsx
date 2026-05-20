'use client';

import { AudienceBranch } from '@/lib/types';

export function BranchProgress({
  branches,
  currentIndex,
}: {
  branches: AudienceBranch[];
  currentIndex: number;
}) {
  if (branches.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 mb-4">
      {branches.map((branch, i) => (
        <div
          key={i}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            i === currentIndex
              ? 'bg-[var(--expedia-navy)] text-white'
              : i < currentIndex
              ? 'bg-[var(--status-green)]/20 text-[var(--status-green)]'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
          }`}
        >
          {i < currentIndex && <span className="mr-1">✓</span>}
          {branch.segment.name}
        </div>
      ))}
    </div>
  );
}
