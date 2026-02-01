'use client';

import { useState } from 'react';
import { AudienceSegment, PersonificationResponse } from '@/lib/types';

interface PersonificationReviewProps {
  segment: AudienceSegment;
  personification: PersonificationResponse;
  onConfirm: (editedNarrative: string) => void;
  onBack: () => void;
  loading: boolean;
}

export function PersonificationReview({
  segment,
  personification,
  onConfirm,
  onBack,
  loading,
}: PersonificationReviewProps) {
  const [narrative, setNarrative] = useState(personification.narrative);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={loading}
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
          Gate 2: Step 2
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Review Audience Profile
        </h2>
        <p className="text-[var(--text-secondary)]">
          {personification.intro}{' '}
          <strong className="text-[var(--expedia-navy)]">{segment.name}</strong>
        </p>
      </div>

      {/* Editable Narrative Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Audience Personification
          </h3>
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Click to edit
          </span>
        </div>

        <div
          className="p-4 rounded-xl border transition-all hover:border-[var(--expedia-navy)]/50 hover:shadow-sm"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Edit this narrative to better match your understanding of the audience.
          </p>
          <textarea
            className="w-full bg-transparent border-none resize-none text-[var(--text-primary)] leading-relaxed focus:outline-none focus:ring-0 p-0"
            style={{ minHeight: '280px' }}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Enter audience personification..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-3">
        <button
          onClick={() => onConfirm(narrative)}
          disabled={loading || !narrative.trim()}
          className="btn-secondary flex items-center gap-2"
        >
          {loading ? (
            <>
              <LoadingSpinner />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <span>Confirm & Generate Insights</span>
              <span>→</span>
            </>
          )}
        </button>
        <button
          onClick={onBack}
          disabled={loading}
          className="btn-outline flex items-center gap-2"
        >
          <span>← Back to Segments</span>
        </button>
      </div>
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
