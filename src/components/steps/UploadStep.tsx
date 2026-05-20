'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { FileUpload } from '@/components/FileUpload';
import { LoadingProgress } from '@/components/LoadingProgress';
import { TRIAGE_STAGES } from '@/lib/loading-config';
import { Status } from '@/lib/types';

export function UploadStep() {
  const { state, updateState, progress } = useBriefState();
  const triageProgress = progress.triage;

  if (state.loading && triageProgress.isActive) {
    return (
      <LoadingProgress
        stages={TRIAGE_STAGES}
        currentStageIndex={triageProgress.currentStageIndex}
        showTips={true}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Upload Your Brief
        </h2>
        <p className="text-[var(--text-secondary)]">
          Upload a document or paste your brief below. I'll assess each section, highlighting what's strong and what needs work.
        </p>
      </div>

      {/* File Upload */}
      <FileUpload
        onFileContent={(content, filename) => updateState({ brief: content, briefFilename: filename, error: null })}
        disabled={state.loading}
      />

      {/* Seller Name + Continue — immediately after upload, before the long textarea */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Seller name (optional, for tracking)"
          value={state.briefScore?.sellerName || ''}
          onChange={(e) => updateState({
            briefScore: {
              sessionId: state.briefScore?.sessionId || '',
              sellerName: e.target.value,
              timestamp: state.briefScore?.timestamp || '',
              gate1Scores: state.briefScore?.gate1Scores || {} as Record<'objective' | 'budget' | 'audience' | 'creative_task', Status>,
              gate1OverallHealth: state.briefScore?.gate1OverallHealth || '',
              completedSteps: state.briefScore?.completedSteps || [],
            }
          })}
          className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--expedia-navy)] focus:border-transparent"
        />
      </div>

      <button
        onClick={() => updateState({ step: 'tell_me_more' })}
        disabled={!state.brief.trim()}
        className="btn-secondary flex items-center gap-2 w-full justify-center"
      >
        Continue →
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[var(--border-color)]" />
        <span className="text-sm text-[var(--text-muted)]">or paste directly</span>
        <div className="flex-1 h-px bg-[var(--border-color)]" />
      </div>

      {/* Text Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Brief Content
        </label>
        <textarea
          aria-label="Paste your brief content here"
          className="textarea-field font-mono text-sm"
          style={{ minHeight: '250px' }}
          placeholder="Paste the full brief content here..."
          value={state.brief}
          onChange={(e) => updateState({ brief: e.target.value })}
        />
      </div>
    </div>
  );
}
