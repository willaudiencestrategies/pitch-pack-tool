'use client';

import { Status } from '@/lib/types';

interface SectionFooterProps {
  onRefine: () => void;
  onContinue: () => void;
  status: Status;
  refineLabel?: string;
  continueLabel?: string;
  disabled?: boolean;
}

export function SectionFooter({
  onRefine,
  onContinue,
  status,
  refineLabel = 'Keep refining',
  continueLabel = 'Confirm & continue',
  disabled = false,
}: SectionFooterProps) {
  const isGreen = status === 'green';

  return (
    <div
      className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border-color)]"
      style={{ animation: 'sectionFooterFadeIn 0.3s ease-out' }}
    >
      {/* Left side - contextual message */}
      <div className="flex items-center gap-2">
        {isGreen ? (
          <>
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full"
              style={{
                backgroundColor: 'var(--status-green)',
                animation: 'checkPop 0.3s ease-out',
              }}
            >
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
            </span>
            <span className="text-sm font-medium text-[var(--status-green)]">
              Looking good!
            </span>
          </>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">
            You can continue even if not perfect.
          </span>
        )}
      </div>

      {/* Right side - action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onRefine}
          disabled={disabled}
          className="btn-outline text-sm px-5 py-2.5"
        >
          {refineLabel}
        </button>
        <button
          onClick={onContinue}
          disabled={disabled}
          className="btn-secondary text-sm px-5 py-2.5 flex items-center gap-2"
        >
          <span>{continueLabel}</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      </div>

      <style jsx>{`
        @keyframes sectionFooterFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes checkPop {
          0% {
            transform: scale(0);
          }
          70% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
