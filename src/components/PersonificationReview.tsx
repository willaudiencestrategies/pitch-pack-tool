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
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Review Audience Profile
        </h2>
        <p className="text-[var(--text-secondary)]">
          {personification.intro}{' '}
          <strong className="text-[var(--expedia-navy)]">{segment.name}</strong>
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Audience Personification
        </label>
        <p className="text-xs text-[var(--text-muted)]">
          Feel free to edit this narrative to better match your understanding of the audience.
        </p>
        <textarea
          className="textarea-field"
          style={{ minHeight: '300px' }}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onConfirm(narrative)}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          Confirm & Generate Insights
          <span>→</span>
        </button>
        <button onClick={onBack} disabled={loading} className="btn-outline">
          ← Back to Segments
        </button>
      </div>
    </div>
  );
}
