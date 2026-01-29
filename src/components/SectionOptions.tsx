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

const LEVEL_LABELS: Record<OptionLevel, { number: number; title: string; description: string }> = {
  lifted: { number: 1, title: 'Lifted Directly', description: 'Verbatim from brief' },
  light: { number: 2, title: 'Light Edits', description: 'Tightened for clarity' },
  inspired: { number: 3, title: 'Inspired Coherence', description: 'Interpreted for coherence' },
  ruthless: { number: 4, title: 'Ruthless Clarity', description: 'Bold strategic reframe' },
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
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Current State
        </h3>
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-secondary)]">{currentState}</p>
          {alignmentCheck && (
            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Alignment Check
              </p>
              <p className="text-sm text-[var(--text-secondary)]">{alignmentCheck}</p>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Choose an approach
        </h3>
        {options.map((option, index) => (
          <div
            key={option.level}
            style={{
              animation: 'fadeSlideIn 0.3s ease-out forwards',
              animationDelay: `${index * 100}ms`,
              opacity: 0,
            }}
          >
            <div
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-[var(--expedia-navy)]/50 hover:shadow-sm ${
                selectedLevel === option.level
                  ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5'
                  : 'border-[var(--border-color)]'
              }`}
              onClick={() => onSelect(option.level)}
            >
              <div className="flex items-start gap-3">
                {/* Option number badge */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    backgroundColor: selectedLevel === option.level
                      ? 'var(--expedia-navy)'
                      : 'var(--bg-tertiary)',
                    color: selectedLevel === option.level
                      ? 'white'
                      : 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {LEVEL_LABELS[option.level].number}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">
                        {LEVEL_LABELS[option.level].title}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        {LEVEL_LABELS[option.level].description}
                      </p>
                    </div>
                    {/* Selection indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedLevel === option.level
                          ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]'
                          : 'border-[var(--border-color)]'
                      }`}
                    >
                      {selectedLevel === option.level && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-white rounded-lg border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-primary)]">{option.content}</p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                        Why this option
                      </p>
                      <p className="text-[var(--text-secondary)]">{option.reasoning}</p>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                        Watch for
                      </p>
                      <p className="text-[var(--text-secondary)]">{option.watchFor}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm */}
      <button
        onClick={onConfirm}
        disabled={!selectedLevel || loading}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <LoadingSpinner />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <span>Confirm Selection & Continue</span>
            <span>→</span>
          </>
        )}
      </button>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// Helper component for loading spinner
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        strokeLinecap="round"
      />
    </svg>
  );
}
