'use client';

import { SectionOption, OptionLevel } from '@/lib/types';

interface SectionOptionsProps {
  currentState: string;
  alignmentCheck?: string;
  options: SectionOption[];
  selectedLevel: OptionLevel | null;
  onSelect: (level: OptionLevel) => void;
  onConfirm: () => void;
  loading: boolean;
}

const LEVEL_LABELS: Record<OptionLevel, { title: string; description: string }> = {
  lifted: { title: 'Option 1: Lifted Directly', description: 'Verbatim from brief' },
  light: { title: 'Option 2: Light Edits', description: 'Tightened for clarity' },
  inspired: { title: 'Option 3: Inspired Coherence', description: 'Interpreted for coherence' },
  ruthless: { title: 'Option 4: Ruthless Clarity', description: 'Bold strategic reframe' },
};

export function SectionOptions({
  currentState,
  alignmentCheck,
  options,
  selectedLevel,
  onSelect,
  onConfirm,
  loading,
}: SectionOptionsProps) {
  return (
    <div className="space-y-6">
      {/* Current State */}
      <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">Current State</h3>
        <p className="text-sm text-[var(--text-secondary)]">{currentState}</p>
        {alignmentCheck && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
            <p className="text-xs font-medium text-[var(--text-muted)]">Alignment Check</p>
            <p className="text-sm text-[var(--text-secondary)]">{alignmentCheck}</p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--text-primary)]">Choose an approach:</h3>
        {options.map((option) => (
          <div
            key={option.level}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedLevel === option.level
                ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5'
                : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'
            }`}
            onClick={() => onSelect(option.level)}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-[var(--text-primary)]">
                  {LEVEL_LABELS[option.level].title}
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  {LEVEL_LABELS[option.level].description}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedLevel === option.level
                  ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]'
                  : 'border-[var(--border-color)]'
              }`}>
                {selectedLevel === option.level && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            <div className="mt-3 p-3 bg-white rounded-lg">
              <p className="text-sm text-[var(--text-primary)]">{option.content}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-medium text-[var(--text-muted)]">Why this option:</p>
                <p className="text-[var(--text-secondary)]">{option.reasoning}</p>
              </div>
              <div>
                <p className="font-medium text-[var(--text-muted)]">Watch for:</p>
                <p className="text-[var(--text-secondary)]">{option.watchFor}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm */}
      <button
        onClick={onConfirm}
        disabled={!selectedLevel || loading}
        className="btn-secondary w-full"
      >
        {loading ? 'Processing...' : 'Confirm Selection & Continue'}
      </button>
    </div>
  );
}
