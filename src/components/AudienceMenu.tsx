'use client';

import { useState } from 'react';
import { AudienceSegment, AudienceSegmentMenu, AudiencePrioritisation } from '@/lib/types';

interface AudienceMenuProps {
  menu: AudienceSegmentMenu;
  onSelect: (segments: AudienceSegment[], prioritisation: AudiencePrioritisation) => void;
  onRegenerate: (feedback: string) => void;
  onBack: () => void;
  loading: boolean;
}

interface EditedSegment extends AudienceSegment {
  tagline?: string;
  isEdited?: boolean;
}

export function AudienceMenu({ menu, onSelect, onRegenerate, onBack, loading }: AudienceMenuProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editingSegment, setEditingSegment] = useState<EditedSegment | null>(null);
  const [editedSegments, setEditedSegments] = useState<Record<number, EditedSegment>>({});
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [secondaryIds, setSecondaryIds] = useState<Set<number>>(new Set());

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

  const handleSetPrimary = (id: number) => {
    if (loading) return;
    // If clicking the current primary, do nothing (primary is required)
    if (primaryId === id) return;
    // If this was a secondary, remove it from secondary
    const newSecondary = new Set(secondaryIds);
    newSecondary.delete(id);
    setSecondaryIds(newSecondary);
    setPrimaryId(id);
  };

  const handleToggleSecondary = (id: number) => {
    if (loading) return;
    // Can't toggle secondary on the primary
    if (primaryId === id) return;

    const newSecondary = new Set(secondaryIds);
    if (newSecondary.has(id)) {
      newSecondary.delete(id);
    } else {
      // Max 2 secondary audiences
      if (newSecondary.size >= 2) {
        return;
      }
      newSecondary.add(id);
    }
    setSecondaryIds(newSecondary);
  };

  const handleConfirmSelection = () => {
    if (loading || primaryId === null) return;

    const primarySegment = editedSegments[primaryId] || menu.segments.find(s => s.id === primaryId)!;
    const secondarySegments = menu.segments
      .filter(s => secondaryIds.has(s.id))
      .map(s => editedSegments[s.id] || s);

    const allSelected = [primarySegment, ...secondarySegments];
    const prioritisation: AudiencePrioritisation = {
      primary: primarySegment,
      secondary: secondarySegments,
    };

    onSelect(allSelected, prioritisation);
  };

  const isPrimary = (id: number) => primaryId === id;
  const isSecondary = (id: number) => secondaryIds.has(id);
  const isSelected = (id: number) => isPrimary(id) || isSecondary(id);
  const canAddSecondary = secondaryIds.size < 2;

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

      {/* Instructions */}
      <div className="bg-[var(--expedia-navy)]/5 rounded-xl p-4 border border-[var(--expedia-navy)]/20">
        <p className="text-sm text-[var(--text-primary)] font-medium mb-2">
          How to prioritise your audiences:
        </p>
        <ul className="text-sm text-[var(--text-secondary)] space-y-1">
          <li className="flex items-start gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--expedia-navy)] text-white text-xs font-bold flex-shrink-0 mt-0.5">★</span>
            <span><strong>Primary</strong> (required) — Gets the full persona treatment with rich detail</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--expedia-yellow)] text-[var(--expedia-navy)] text-xs font-bold flex-shrink-0 mt-0.5">2</span>
            <span><strong>Secondary</strong> (optional, max 2) — Supporting audiences, names only in output</span>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        {menu.segments.map((original) => {
          const segment = getSegmentToDisplay(original);
          const isEditedFlag = editedSegments[original.id]?.isEdited;
          const segmentIsPrimary = isPrimary(original.id);
          const segmentIsSecondary = isSecondary(original.id);
          const segmentIsSelected = isSelected(original.id);

          return (
            <div
              key={original.id}
              className={`p-4 rounded-xl border-2 transition-all group relative ${
                segmentIsPrimary
                  ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5 shadow-md'
                  : segmentIsSecondary
                  ? 'border-[var(--expedia-yellow)] bg-[var(--expedia-yellow)]/10 shadow-sm'
                  : 'border-[var(--border-color)] hover:border-[var(--expedia-navy)]/30 hover:shadow-sm'
              }`}
            >
              {/* Priority badges */}
              {segmentIsPrimary && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--expedia-navy)] text-white text-xs font-semibold shadow-md">
                  <span>★</span> Primary
                </div>
              )}
              {segmentIsSecondary && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--expedia-yellow)] text-[var(--expedia-navy)] text-xs font-semibold shadow-md">
                  Secondary
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Selection Controls */}
                <div className="flex flex-col gap-2 pt-1">
                  {/* Primary Radio */}
                  <button
                    onClick={() => handleSetPrimary(original.id)}
                    disabled={loading}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      segmentIsPrimary
                        ? 'bg-[var(--expedia-navy)] border-[var(--expedia-navy)] text-white'
                        : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--expedia-navy)] hover:text-[var(--expedia-navy)]'
                    }`}
                    title="Set as primary audience"
                  >
                    <span className="text-sm font-bold">★</span>
                  </button>
                  {/* Secondary Toggle */}
                  <button
                    onClick={() => handleToggleSecondary(original.id)}
                    disabled={loading || segmentIsPrimary || (!segmentIsSecondary && !canAddSecondary)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      segmentIsSecondary
                        ? 'bg-[var(--expedia-yellow)] border-[var(--expedia-yellow)] text-[var(--expedia-navy)]'
                        : segmentIsPrimary
                        ? 'border-[var(--border-color)] text-[var(--text-muted)] opacity-30 cursor-not-allowed'
                        : !canAddSecondary
                        ? 'border-[var(--border-color)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'
                        : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--expedia-yellow)] hover:text-[var(--expedia-yellow)]'
                    }`}
                    title={segmentIsPrimary ? 'Cannot set primary as secondary' : !canAddSecondary && !segmentIsSecondary ? 'Max 2 secondary audiences' : 'Toggle as secondary audience'}
                  >
                    <span className="text-sm font-bold">2</span>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-lg ${
                        segmentIsSelected ? 'text-[var(--expedia-navy)]' : 'text-[var(--expedia-navy)]'
                      }`}>
                        {segment.name}
                      </h3>
                      {isEditedFlag && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--expedia-navy)]/10 text-[var(--expedia-navy)]">
                          (edited)
                        </span>
                      )}
                    </div>
                    {segment.tagline && (
                      <p className="text-sm text-[var(--text-muted)] italic">
                        "{segment.tagline}"
                      </p>
                    )}
                  </div>
                  <p className="text-[var(--text-primary)] mb-2">{segment.needsValues}</p>
                  <p className="text-sm text-[var(--text-muted)]">{segment.demographics}</p>
                </div>

                {/* Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSegment({ ...segment });
                  }}
                  className="btn-edit flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Summary and Confirm Button */}
      <div className="pt-4 border-t border-[var(--border-color)] mt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {primaryId !== null ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--expedia-navy)] text-white text-xs font-semibold">
                    ★ Primary
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {getSegmentToDisplay(menu.segments.find(s => s.id === primaryId)!).name}
                  </span>
                </div>
                {secondaryIds.size > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--expedia-yellow)] text-[var(--expedia-navy)] text-xs font-semibold">
                      Secondary
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {Array.from(secondaryIds).map(id => getSegmentToDisplay(menu.segments.find(s => s.id === id)!).name).join(', ')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-sm text-[var(--text-muted)]">
                Select a primary audience to continue
              </span>
            )}
          </div>
          <button
            onClick={handleConfirmSelection}
            disabled={loading || primaryId === null}
            className="px-5 py-2.5 text-sm font-medium bg-[var(--expedia-navy)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm & Continue →'}
          </button>
        </div>
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
                  Tagline
                </label>
                <input
                  type="text"
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] focus:border-[var(--expedia-navy)] focus:outline-none text-sm"
                  placeholder="e.g. Collects experiences like currency"
                  value={editingSegment.tagline || ''}
                  onChange={(e) =>
                    setEditingSegment({ ...editingSegment, tagline: e.target.value })
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
