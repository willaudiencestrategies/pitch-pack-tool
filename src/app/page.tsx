// src/app/page.tsx

'use client';

import { useState } from 'react';
import {
  SessionState,
  Section,
  Segment,
  Truth,
  Status,
  createInitialState,
  TriageResponse,
  SectionResponse,
  AudienceResponse,
  TruthsResponse,
  OutputResponse,
} from '@/lib/types';

// ============================================
// Helper Components
// ============================================

function StatusBadge({ status }: { status: Status }) {
  const config = {
    green: { className: 'status-green', label: 'Good', icon: '✓' },
    amber: { className: 'status-amber', label: 'Needs Work', icon: '!' },
    red: { className: 'status-red', label: 'Missing', icon: '✗' },
  };
  const { className, label, icon } = config[status];

  return (
    <span className={`status-badge ${className}`}>
      <span className="text-xs">{icon}</span>
      {label}
    </span>
  );
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-5 w-5 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function LoadingOverlay({ message, subMessage }: { message: string; subMessage?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      {/* Animated dots */}
      <div className="flex gap-2 mb-6">
        <div
          className="w-3 h-3 rounded-full bg-[var(--expedia-navy)] animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="w-3 h-3 rounded-full bg-[var(--expedia-navy)] animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="w-3 h-3 rounded-full bg-[var(--expedia-navy)] animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>

      {/* Main message */}
      <p className="text-lg font-medium text-[var(--text-primary)] text-center">{message}</p>

      {/* Sub message */}
      {subMessage && (
        <p className="text-sm text-[var(--text-muted)] mt-2 text-center">{subMessage}</p>
      )}

      {/* Progress bar animation */}
      <div className="w-48 h-1 bg-[var(--bg-tertiary)] rounded-full mt-6 overflow-hidden">
        <div
          className="h-full bg-[var(--expedia-navy)] rounded-full animate-pulse"
          style={{
            width: '60%',
            animation: 'loading-progress 2s ease-in-out infinite',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes loading-progress {
          0% {
            width: 10%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 10%;
            margin-left: 90%;
          }
        }
      `}</style>
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
  onSkip,
}: {
  message: string;
  onRetry: () => void;
  onSkip?: () => void;
}) {
  return (
    <div className="mb-6 p-4 rounded-xl bg-[var(--status-red-bg)] border border-[var(--status-red)]">
      <p className="text-[var(--status-red)] text-sm mb-3 font-medium">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium bg-[var(--status-red)] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium border border-[var(--status-red)] text-[var(--status-red)] rounded-lg hover:bg-[var(--status-red-bg)] transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mt-8">
      <div className="flex justify-between text-sm text-[var(--text-muted)] mb-2">
        <span>Progress</span>
        <span>
          {current + 1} of {total}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < current
                ? 'bg-[var(--status-green)]'
                : i === current
                ? 'bg-[var(--expedia-navy)]'
                : 'bg-[var(--border-color)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SectionStepContent({
  section,
  sectionIndex,
  totalSections,
  loading,
  onReassess,
  onGenerate,
  onUpdateContent,
  onUpdateSuggestion,
  onAcceptSuggestion,
  onNext,
}: {
  section: Section;
  sectionIndex: number;
  totalSections: number;
  loading: boolean;
  onReassess: (info: string) => void;
  onGenerate: () => void;
  onUpdateContent: (content: string) => void;
  onUpdateSuggestion: (suggestion: string) => void;
  onAcceptSuggestion: () => void;
  onNext: () => void;
}) {
  const [additionalInfo, setAdditionalInfo] = useState('');

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-1">
            Section {sectionIndex + 1} of {totalSections}
          </p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{section.name}</h2>
        </div>
        <StatusBadge status={section.status} />
      </div>

      {/* Current Content */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Current Content
        </label>
        <textarea
          aria-label={`Current content for ${section.name}`}
          className="textarea-field"
          style={{ minHeight: '140px' }}
          value={section.content || '(No content found in brief)'}
          onChange={(e) => onUpdateContent(e.target.value)}
        />
        {section.feedback && (
          <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-3 rounded-lg">
            {section.feedback}
          </p>
        )}
      </div>

      {/* AI Suggestion */}
      {section.suggestion && (
        <div className="space-y-3 p-4 rounded-xl bg-[var(--expedia-navy)]/5 border border-[var(--expedia-navy)]/20">
          <label className="block text-sm font-medium text-[var(--expedia-navy)]">
            AI Suggestion
          </label>
          <textarea
            aria-label={`AI suggestion for ${section.name}`}
            className="textarea-field border-[var(--expedia-navy)]/30"
            style={{ minHeight: '140px' }}
            value={section.suggestion}
            onChange={(e) => onUpdateSuggestion(e.target.value)}
          />
          <button onClick={onAcceptSuggestion} className="btn-secondary text-sm px-4 py-2">
            Accept Suggestion
          </button>
        </div>
      )}

      {/* Additional Info (for non-green sections) */}
      {section.status !== 'green' && (
        <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-secondary)]">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Do you have any additional information?
          </label>
          <textarea
            aria-label="Additional information for this section"
            className="textarea-field"
            style={{ minHeight: '100px' }}
            placeholder="Add any extra context, notes, or information that might help..."
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={() => onReassess(additionalInfo)}
              disabled={loading || !additionalInfo.trim()}
              className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
            >
              {loading && <Spinner className="text-white" />}
              Re-assess with Info
            </button>
            <button
              onClick={onGenerate}
              disabled={loading}
              className="btn-outline text-sm px-4 py-2 flex items-center gap-2"
            >
              {loading && <Spinner />}
              Generate Suggestion
            </button>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="pt-4">
        <button onClick={onNext} className="btn-secondary flex items-center gap-2">
          {sectionIndex < totalSections - 1 ? 'Confirm & Continue' : 'Finish Sections'}
          <span>→</span>
        </button>
      </div>

      <ProgressBar current={sectionIndex} total={totalSections} />
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function Home() {
  const [state, setState] = useState<SessionState>(createInitialState());
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);

  // State update helper
  const updateState = (updates: Partial<SessionState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // ============================================
  // API Handlers
  // ============================================

  const handleTriage = async () => {
    if (!state.brief.trim()) {
      updateState({ error: 'Please paste your brief first' });
      return;
    }

    updateState({ loading: true, error: null });
    setLastAction(() => handleTriage);

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: state.brief }),
      });

      if (!response.ok) throw new Error('Failed to assess brief');

      const data: TriageResponse = await response.json();
      updateState({
        sections: data.sections,
        step: 'triage',
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleSectionReassess = async (additionalInfo: string) => {
    const section = state.sections[state.currentSectionIndex];
    updateState({ loading: true, error: null });
    setLastAction(() => () => handleSectionReassess(additionalInfo));

    try {
      const response = await fetch('/api/section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: section.key,
          brief: state.brief,
          currentContent: section.content,
          additionalContext: state.additionalContext + '\n' + additionalInfo,
          action: 'reassess',
        }),
      });

      if (!response.ok) throw new Error('Failed to reassess section');

      const data: SectionResponse = await response.json();

      const updatedSections = [...state.sections];
      updatedSections[state.currentSectionIndex] = {
        ...section,
        status: data.status,
        content: data.content,
        feedback: data.feedback,
        suggestion: data.suggestion,
      };

      updateState({
        sections: updatedSections,
        additionalContext: state.additionalContext + '\n' + additionalInfo,
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleSectionGenerate = async () => {
    const section = state.sections[state.currentSectionIndex];
    updateState({ loading: true, error: null });
    setLastAction(() => handleSectionGenerate);

    try {
      const response = await fetch('/api/section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: section.key,
          brief: state.brief,
          currentContent: section.content,
          additionalContext: state.additionalContext,
          action: 'generate',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate suggestion');

      const data: SectionResponse = await response.json();

      const updatedSections = [...state.sections];
      updatedSections[state.currentSectionIndex] = {
        ...section,
        suggestion: data.suggestion,
      };

      updateState({ sections: updatedSections, loading: false });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleGenerateAudience = async () => {
    updateState({ loading: true, error: null });
    setLastAction(() => handleGenerateAudience);

    try {
      const response = await fetch('/api/generate/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          additionalContext: state.additionalContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate audience options');

      const data: AudienceResponse = await response.json();
      updateState({
        audienceOptions: data.segments || [],
        step: 'audience',
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleSelectAudience = async (segment: Segment) => {
    updateState({ loading: true, error: null, selectedAudience: segment });
    setLastAction(() => () => handleSelectAudience(segment));

    try {
      const response = await fetch('/api/generate/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          additionalContext: state.additionalContext,
          selectedSegment: segment,
        }),
      });

      if (!response.ok) throw new Error('Failed to personify audience');

      const data: AudienceResponse = await response.json();
      updateState({
        personification: data.personification || '',
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleGenerateTruths = async () => {
    if (!state.selectedAudience) return;

    updateState({ loading: true, error: null });
    setLastAction(() => handleGenerateTruths);

    try {
      const response = await fetch('/api/generate/truths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: state.selectedAudience,
          personification: state.personification,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate truths');

      const data: TruthsResponse = await response.json();
      updateState({
        truthOptions: data.truths,
        step: 'truths',
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleCompileOutput = async () => {
    updateState({ loading: true, error: null });
    setLastAction(() => handleCompileOutput);

    try {
      const response = await fetch('/api/output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: state.sections,
          audience: state.selectedAudience,
          personification: state.personification,
          selectedTruths: state.selectedTruths,
        }),
      });

      if (!response.ok) throw new Error('Failed to compile output');

      const data: OutputResponse = await response.json();

      // Store markdown in a section for display
      updateState({ step: 'output', loading: false });

      // Open in new window
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Pitch Pack</title>
              <style>
                body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
                h1, h2, h3 { margin-top: 2rem; }
                pre { white-space: pre-wrap; background: #f5f5f5; padding: 1rem; border-radius: 4px; }
              </style>
            </head>
            <body>
              <pre>${data.markdown}</pre>
            </body>
          </html>
        `);
      } else {
        // Popup was blocked, show in alert or copy to clipboard
        alert('Popup blocked. Your Pitch Pack has been copied to clipboard.');
        navigator.clipboard.writeText(data.markdown);
      }
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  // Navigation helpers
  const goToNextSection = () => {
    const nextIndex = state.currentSectionIndex + 1;

    // Check if we need to go to audience generation
    const currentSection = state.sections[state.currentSectionIndex];
    if (currentSection.key === 'audience' && state.audienceOptions.length === 0) {
      handleGenerateAudience();
      return;
    }

    // Check if we need to go to truths generation
    if (currentSection.key === 'human_truths' && state.truthOptions.length === 0) {
      handleGenerateTruths();
      return;
    }

    if (nextIndex < state.sections.length) {
      updateState({ currentSectionIndex: nextIndex });
    } else {
      updateState({ step: 'output' });
    }
  };

  const updateSectionContent = (content: string) => {
    const updatedSections = [...state.sections];
    updatedSections[state.currentSectionIndex] = {
      ...updatedSections[state.currentSectionIndex],
      content,
    };
    updateState({ sections: updatedSections });
  };

  const updateSectionSuggestion = (suggestion: string) => {
    const updatedSections = [...state.sections];
    updatedSections[state.currentSectionIndex] = {
      ...updatedSections[state.currentSectionIndex],
      suggestion,
    };
    updateState({ sections: updatedSections });
  };

  const acceptSuggestion = () => {
    const section = state.sections[state.currentSectionIndex];
    if (section.suggestion) {
      const updatedSections = [...state.sections];
      updatedSections[state.currentSectionIndex] = {
        ...updatedSections[state.currentSectionIndex],
        content: section.suggestion,
        suggestion: undefined,
        status: 'green',
      };
      updateState({ sections: updatedSections });
    }
  };

  // ============================================
  // Step Renderers
  // ============================================

  const renderUploadStep = () => {
    if (state.loading) {
      return (
        <LoadingOverlay
          message="Analyzing your brief..."
          subMessage="Extracting content and assessing each section"
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
            Paste your brief below and I'll assess each section, highlighting what's strong and what
            needs work.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Brief Content
          </label>
          <textarea
            aria-label="Paste your brief content here"
            className="textarea-field font-mono text-sm"
            style={{ minHeight: '280px' }}
            placeholder="Paste the full brief content here..."
            value={state.brief}
            onChange={(e) => updateState({ brief: e.target.value })}
          />
        </div>

        <button
          onClick={handleTriage}
          disabled={!state.brief.trim()}
          className="btn-secondary flex items-center gap-2 w-full justify-center"
        >
          Assess Brief →
        </button>
      </div>
    );
  };

  const renderTriageStep = () => (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Initial Assessment
        </h2>
        <p className="text-[var(--text-secondary)]">
          Here's my review of your brief across the 7 Pitch Pack sections.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
        {state.sections.map((section, index) => (
          <div
            key={section.key}
            className={`flex items-center justify-between p-4 ${
              index !== state.sections.length - 1 ? 'border-b border-[var(--border-color)]' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-medium text-[var(--text-muted)]">
                {index + 1}
              </span>
              <span className="font-medium text-[var(--text-primary)]">{section.name}</span>
            </div>
            <StatusBadge status={section.status} />
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Before we go section by section...
        </label>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Do you have any additional context? (Other documents, website content, client notes)
        </p>
        <textarea
          aria-label="Additional context for the brief"
          className="textarea-field"
          style={{ minHeight: '100px' }}
          placeholder="Paste any additional context here (optional)..."
          value={state.additionalContext}
          onChange={(e) => updateState({ additionalContext: e.target.value })}
        />
      </div>

      <button
        onClick={() => updateState({ step: 'sections', currentSectionIndex: 0 })}
        className="btn-secondary flex items-center gap-2 w-full justify-center"
      >
        Continue to Sections
        <span>→</span>
      </button>
    </div>
  );

  const renderSectionStep = () => {
    const section = state.sections[state.currentSectionIndex];

    return (
      <SectionStepContent
        key={section.key}
        section={section}
        sectionIndex={state.currentSectionIndex}
        totalSections={state.sections.length}
        loading={state.loading}
        onReassess={handleSectionReassess}
        onGenerate={handleSectionGenerate}
        onUpdateContent={updateSectionContent}
        onUpdateSuggestion={updateSectionSuggestion}
        onAcceptSuggestion={acceptSuggestion}
        onNext={goToNextSection}
      />
    );
  };

  const renderAudienceStep = () => {
    // Loading state for audience generation or personification
    if (state.loading && state.audienceOptions.length === 0) {
      return (
        <LoadingOverlay
          message="Generating audience segments..."
          subMessage="Creating 5 distinct audience profiles based on your brief"
        />
      );
    }

    if (state.loading && state.selectedAudience && !state.personification) {
      return (
        <LoadingOverlay
          message={`Developing ${state.selectedAudience.name}...`}
          subMessage="Creating a rich personification of this audience segment"
        />
      );
    }

    if (state.loading && state.personification) {
      return (
        <LoadingOverlay
          message="Generating human truths..."
          subMessage="Creating 12 psychological insights for your audience"
        />
      );
    }

    if (state.selectedAudience && state.personification) {
      // Personification review
      return (
        <div className="space-y-6">
          <div className="text-center pb-6 border-b border-[var(--border-color)]">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
              Review Audience Profile
            </h2>
            <p className="text-[var(--text-secondary)]">
              Here's the expanded profile for{' '}
              <strong className="text-[var(--expedia-navy)]">{state.selectedAudience.name}</strong>
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Audience Personification
            </label>
            <textarea
              aria-label="Audience personification"
              className="textarea-field"
              style={{ minHeight: '240px' }}
              value={state.personification}
              onChange={(e) => updateState({ personification: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerateTruths}
              className="btn-secondary flex items-center gap-2"
            >
              Confirm & Generate Human Truths
              <span>→</span>
            </button>
            <button
              onClick={() => updateState({ selectedAudience: null, personification: '' })}
              className="btn-outline"
            >
              ← Back
            </button>
          </div>
        </div>
      );
    }

    // Segment selection
    return (
      <div className="space-y-6">
        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Choose Your Audience
          </h2>
          <p className="text-[var(--text-secondary)]">
            Based on your brief, here are 5 potential audience segments. Click one to develop
            further.
          </p>
        </div>

        <div className="space-y-3">
          {state.audienceOptions.map((segment) => (
            <div
              key={segment.id}
              className="p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--expedia-navy)] hover:shadow-md cursor-pointer transition-all group"
              onClick={() => handleSelectAudience(segment)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectAudience(segment);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-[var(--expedia-navy)] group-hover:underline">
                  {segment.name}
                </h3>
              </div>
              <p className="text-[var(--text-primary)] mb-2">{segment.description}</p>
              <p className="text-sm text-[var(--text-muted)]">{segment.demographics}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerateAudience}
          disabled={state.loading}
          className="btn-outline text-sm"
        >
          Regenerate Options
        </button>
      </div>
    );
  };

  const renderTruthsStep = () => {
    if (state.loading && state.truthOptions.length === 0) {
      return (
        <LoadingOverlay
          message="Generating human truths..."
          subMessage="Creating 12 psychological insights across safer, sharper, and bolder levels"
        />
      );
    }

    const toggleTruth = (truth: Truth) => {
      const isSelected = state.selectedTruths.some((t) => t.id === truth.id);
      if (isSelected) {
        updateState({
          selectedTruths: state.selectedTruths.filter((t) => t.id !== truth.id),
        });
      } else {
        updateState({
          selectedTruths: [...state.selectedTruths, truth],
        });
      }
    };

    const updateTruthText = (id: number, text: string) => {
      const updatedTruths = state.truthOptions.map((t) => (t.id === id ? { ...t, text } : t));
      updateState({ truthOptions: updatedTruths });

      // Also update in selected if present
      const updatedSelected = state.selectedTruths.map((t) => (t.id === id ? { ...t, text } : t));
      updateState({ selectedTruths: updatedSelected });
    };

    const truthsByLevel = {
      safer: state.truthOptions.filter((t) => t.level === 'safer'),
      sharper: state.truthOptions.filter((t) => t.level === 'sharper'),
      bolder: state.truthOptions.filter((t) => t.level === 'bolder'),
    };

    const levelLabels = {
      safer: { label: 'Safer', desc: 'Broad appeal, easy to execute', color: 'var(--status-green)' },
      sharper: { label: 'Sharper', desc: 'Clearer trade-offs, more distinctive', color: 'var(--status-amber)' },
      bolder: { label: 'Bolder', desc: 'Provocative, high impact', color: 'var(--status-red)' },
    };

    return (
      <div className="space-y-6">
        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Select Human Truths
          </h2>
          <p className="text-[var(--text-secondary)]">
            12 truths ranging from safer to bolder. Select the ones that resonate with your
            audience.
          </p>
        </div>

        {(['safer', 'sharper', 'bolder'] as const).map((level) => (
          <div key={level} className="space-y-3">
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: levelLabels[level].color }}
              />
              <span className="font-semibold text-[var(--text-primary)]">
                {levelLabels[level].label}
              </span>
              <span className="text-sm text-[var(--text-muted)]">— {levelLabels[level].desc}</span>
            </div>
            <div className="space-y-2 pl-6">
              {truthsByLevel[level].map((truth) => {
                const isSelected = state.selectedTruths.some((t) => t.id === truth.id);
                return (
                  <div
                    key={truth.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5'
                        : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'
                    }`}
                    onClick={() => toggleTruth(truth)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTruth(truth)}
                      className="mt-1 h-4 w-4 accent-[var(--expedia-navy)]"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={truth.text}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateTruthText(truth.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent text-sm text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
          <span className="text-sm text-[var(--text-muted)]">
            {state.selectedTruths.length} selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateTruths}
              disabled={state.loading}
              className="btn-outline text-sm px-4 py-2"
            >
              Regenerate
            </button>
            <button
              onClick={() => {
                // Update the human truths section and continue
                const updatedSections = [...state.sections];
                const truthsIndex = updatedSections.findIndex((s) => s.key === 'human_truths');
                if (truthsIndex >= 0) {
                  updatedSections[truthsIndex] = {
                    ...updatedSections[truthsIndex],
                    status: 'green',
                    content: state.selectedTruths.map((t) => `- ${t.text}`).join('\n'),
                  };
                }
                // Also update audience section
                const audienceIndex = updatedSections.findIndex((s) => s.key === 'audience');
                if (audienceIndex >= 0 && state.selectedAudience) {
                  updatedSections[audienceIndex] = {
                    ...updatedSections[audienceIndex],
                    status: 'green',
                    content: `**${state.selectedAudience.name}**\n\n${state.selectedAudience.description}\n\n${state.personification}`,
                  };
                }
                updateState({
                  sections: updatedSections,
                  step: 'sections',
                  currentSectionIndex: updatedSections.findIndex((s) => s.key === 'creative_tenets'),
                });
              }}
              disabled={state.selectedTruths.length === 0}
              className="btn-secondary flex items-center gap-2"
            >
              Confirm & Continue
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOutputStep = () => {
    if (state.loading) {
      return (
        <LoadingOverlay
          message="Compiling your Pitch Pack..."
          subMessage="Formatting all sections into the final document"
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Pitch Pack Complete
          </h2>
          <p className="text-[var(--text-secondary)]">
            All sections reviewed. Ready to compile your final Pitch Pack.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
          {state.sections.map((section, index) => (
            <div
              key={section.key}
              className={`p-4 ${
                index !== state.sections.length - 1 ? 'border-b border-[var(--border-color)]' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[var(--text-primary)]">{section.name}</span>
                <StatusBadge status={section.status} />
              </div>
              <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                {section.content || '(not provided)'}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={handleCompileOutput} className="btn-secondary flex items-center gap-2">
            Export Pitch Pack
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure? This will clear all your work.')) {
                setState(createInitialState());
              }
            }}
            className="btn-outline"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  const renderStep = () => {
    switch (state.step) {
      case 'upload':
        return renderUploadStep();
      case 'triage':
        return renderTriageStep();
      case 'sections':
        return renderSectionStep();
      case 'audience':
        return renderAudienceStep();
      case 'truths':
        return renderTruthsStep();
      case 'output':
        return renderOutputStep();
      default:
        return renderUploadStep();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <header className="bg-[var(--expedia-navy)] text-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[var(--expedia-yellow)] flex items-center justify-center">
              <span className="text-[var(--expedia-navy)] font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="font-semibold">Pitch Pack Tool</h1>
              <p className="text-xs text-white/70">E Studio Brief Improvement</p>
            </div>
          </div>
          <div className="text-sm text-white/70">
            {state.step !== 'upload' && (
              <span className="capitalize">{state.step.replace('_', ' ')}</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {state.error && (
          <ErrorBanner
            message={state.error}
            onRetry={() => lastAction?.()}
            onSkip={() => {
              updateState({ error: null });
              if (state.step === 'sections') goToNextSection();
            }}
          />
        )}

        <div className="card-elevated">{renderStep()}</div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-[var(--text-muted)]">
        Pitch Pack Tool for E Studio
      </footer>
    </div>
  );
}
