'use client';

import { AudienceSegment, AudienceSegmentMenu } from '@/lib/types';

interface AudienceMenuProps {
  menu: AudienceSegmentMenu;
  onSelect: (segment: AudienceSegment) => void;
  loading: boolean;
}

export function AudienceMenu({ menu, onSelect, loading }: AudienceMenuProps) {
  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Choose Your Audience
        </h2>
        <p className="text-[var(--text-secondary)]">{menu.intro}</p>
      </div>

      <div className="space-y-3">
        {menu.segments.map((segment) => (
          <div
            key={segment.id}
            className="p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--expedia-navy)] hover:shadow-md cursor-pointer transition-all group"
            onClick={() => !loading && onSelect(segment)}
          >
            <h3 className="font-semibold text-lg text-[var(--expedia-navy)] group-hover:underline mb-2">
              {segment.name}
            </h3>
            <p className="text-[var(--text-primary)] mb-2">{segment.needsValues}</p>
            <p className="text-sm text-[var(--text-muted)]">{segment.demographics}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
