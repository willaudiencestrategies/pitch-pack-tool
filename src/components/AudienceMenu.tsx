'use client';

import { useState } from 'react';
import { AudienceSegment, AudienceSegmentMenu } from '@/lib/types';

interface AudienceMenuProps {
  menu: AudienceSegmentMenu;
  onSelect: (segment: AudienceSegment) => void;
  onRegenerate: (feedback: string) => void;
  onBack: () => void;
  loading: boolean;
}

interface EditedSegment extends AudienceSegment {
  isEdited?: boolean;
}

export function AudienceMenu({ menu, onSelect, onRegenerate, onBack, loading }: AudienceMenuProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editingSegment, setEditingSegment] = useState<EditedSegment | null>(null);
  const [editedSegments, setEditedSegments] = useState<Record<number, EditedSegment>>({});

  const handleRegenerateClick = () => {
    if (feedback.trim()) {
      onRegenerate(feedback);
      setFeedback('');
      setShowFeedback(false);
    }
  };

  const handleEditSave = () => {
    if (editingSegment) {
      setEditedSegments({
        ...editedSegments,
        [editingSegment.id]: { ...editingSegment, isEdited: true },
      });
      setEditingSegment(null);
    }
  };

  const getSegmentToDisplay = (original: AudienceSegment): EditedSegment => {
    return editedSegments[original.id] || original;
  };

  const handleSelectSegment = (original: AudienceSegment) => {
    if (loading) return;
    const segmentToSelect = editedSegments[original.id] || original;
    onSelect(segmentToSelect);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4"
      >
        ← Back to Sections
      </button>

      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Choose Your Audience
        </h2>
        <p className="text-[var(--text-secondary)]">{menu.intro}</p>
      </div>

      <div className="space-y-3">
        {menu.segments.map((original) => {
          const segment = getSegmentToDisplay(original);
          const isEdited = editedSegments[original.id]?.isEdited;

          return (
            <div
              key={original.id}
              className="p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--expedia-navy)] hover:shadow-md transition-all group relative"
            >
              <div
                className="cursor-pointer"
                onClick={() => handleSelectSegment(original)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-[var(--expedia-navy)] group-hover:underline">
                    {segment.name}
                  </h3>
                  {isEdited && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--expedia-navy)]/10 text-[var(--expedia-navy)]">
                      (edited)
                    </span>
                  )}
                </div>
                <p className="text-[var(--text-primary)] mb-2">{segment.needsValues}</p>
                <p className="text-sm text-[var(--text-muted)]">{segment.demographics}</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSegment({ ...segment });
                }}
                className="absolute top-4 right-4 text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--expedia-navy)] hover:text-[var(--expedia-navy)] transition-colors"
              >
                Edit
              </button>
            </div>
          );
        })}
      </div>

      {/* Feedback and Regenerate Section */}
      <div className="pt-4 border-t border-[var(--border-color)]">
        {!showFeedback ? (
          <button
            onClick={() => setShowFeedback(true)}
            disabled={loading}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--expedia-navy)] transition-colors"
          >
            Not quite right? Give feedback & regenerate
          </button>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              What would you like to change about these options?
            </label>
            <textarea
              className="w-full p-3 rounded-lg border border-[var(--border-color)] focus:border-[var(--expedia-navy)] focus:outline-none resize-none text-sm"
              rows={3}
              placeholder="e.g., 'Focus more on business travellers' or 'These feel too generic, make them more specific to families'"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={handleRegenerateClick}
                disabled={loading || !feedback.trim()}
                className="px-4 py-2 text-sm font-medium bg-[var(--expedia-navy)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Regenerating...' : 'Regenerate with Feedback'}
              </button>
              <button
                onClick={() => {
                  setShowFeedback(false);
                  setFeedback('');
                }}
                className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:border-[var(--expedia-navy)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Segment Modal */}
      {editingSegment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Edit Segment
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] focus:border-[var(--expedia-navy)] focus:outline-none text-sm"
                  value={editingSegment.name}
                  onChange={(e) =>
                    setEditingSegment({ ...editingSegment, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Needs & Values
                </label>
                <textarea
                  className="w-full p-3 rounded-lg border border-[var(--border-color)] focus:border-[var(--expedia-navy)] focus:outline-none text-sm resize-y"
                  style={{ minHeight: '120px' }}
                  value={editingSegment.needsValues}
                  onChange={(e) =>
                    setEditingSegment({ ...editingSegment, needsValues: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Demographics
                </label>
                <textarea
                  className="w-full p-3 rounded-lg border border-[var(--border-color)] focus:border-[var(--expedia-navy)] focus:outline-none text-sm resize-y"
                  style={{ minHeight: '80px' }}
                  value={editingSegment.demographics}
                  onChange={(e) =>
                    setEditingSegment({ ...editingSegment, demographics: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleEditSave}
                className="px-4 py-2 text-sm font-medium bg-[var(--expedia-navy)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingSegment(null)}
                className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:border-[var(--expedia-navy)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
