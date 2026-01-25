// src/app/page.tsx

'use client';

import { useState } from 'react';
import {
  SessionState,
  Section,
  Truth,
  Status,
  Step,
  createInitialState,
  EnhancedTriageResponse,
  SectionResponse,
  TruthsResponse,
  OutputResponse,
  AudienceSegment,
  AudienceSegmentMenu,
  PersonificationResponse,
  OptionLevel,
  SectionOptionsResponse,
  SECTION_CONFIG,
  SECTION_KEYS,
} from '@/lib/types';
import { SectionOptions } from '@/components/SectionOptions';
import { AudienceMenu } from '@/components/AudienceMenu';
import { PersonificationReview } from '@/components/PersonificationReview';
import { FileUpload } from '@/components/FileUpload';

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

function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4"
    >
      ← {label}
    </button>
  );
}

// Global progress indicator with sliding focus design
// Current step is prominent, completed steps are compact checkmarks, future steps are dots
function GlobalProgressBar({
  step,
  sectionIndex,
  totalSections,
  sections,
  onNavigate,
}: {
  step: string;
  sectionIndex: number;
  totalSections: number;
  sections: Section[];
  onNavigate: (step: Step) => void;
}) {
  const steps = [
    { key: 'upload', label: 'Upload' },
    { key: 'triage', label: 'Triage' },
    { key: 'sections', label: 'Sections' },
    { key: 'audience', label: 'Audience' },
    { key: 'truths', label: 'Truths' },
    { key: 'output', label: 'Output' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  // Determine which steps should show labels (current and adjacent)
  const shouldShowLabel = (index: number) => {
    return index === currentStepIndex ||
           index === currentStepIndex - 1 ||
           index === currentStepIndex + 1;
  };

  return (
    <div className="bg-white border-b border-[var(--border-color)] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 py-3">
        <div className="flex items-center justify-center gap-1">
          {steps.map((s, i) => {
            const isCompleted = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            const isFuture = i > currentStepIndex;
            const isClickable = isCompleted;
            const showLabel = shouldShowLabel(i);

            return (
              <div key={s.key} className="flex items-center">
                <div
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={isClickable ? () => onNavigate(s.key as Step) : undefined}
                  onKeyDown={isClickable ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate(s.key as Step);
                    }
                  } : undefined}
                  title={s.label}
                  className={`flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'px-4 py-2 rounded-full bg-[var(--expedia-navy)] text-white text-sm font-medium'
                      : isCompleted
                      ? showLabel
                        ? 'px-3 py-1.5 rounded-full bg-[var(--status-green)] text-white text-xs font-medium cursor-pointer hover:bg-[var(--status-green)]/80'
                        : 'w-6 h-6 rounded-full bg-[var(--status-green)] text-white text-xs cursor-pointer hover:bg-[var(--status-green)]/80'
                      : showLabel
                      ? 'px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-xs'
                      : 'w-2 h-2 rounded-full bg-[var(--border-color)]'
                  }`}
                >
                  {isCompleted && !showLabel && <span className="text-[10px]">✓</span>}
                  {isCompleted && showLabel && (
                    <>
                      <span className="mr-1">✓</span>
                      {s.label}
                    </>
                  )}
                  {isCurrent && (
                    <>
                      {s.label}
                      {s.key === 'sections' && (
                        <span className="ml-1 opacity-70">({sectionIndex + 1}/{totalSections})</span>
                      )}
                    </>
                  )}
                  {isFuture && showLabel && s.label}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 mx-1 transition-all ${
                    i < currentStepIndex
                      ? 'w-4 bg-[var(--status-green)]'
                      : shouldShowLabel(i) || shouldShowLabel(i + 1)
                      ? 'w-4 bg-[var(--border-color)]'
                      : 'w-2 bg-[var(--border-color)]'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Section sub-progress when in sections step */}
        {step === 'sections' && sections.length > 0 && (
          <div className="flex gap-1 mt-2">
            {sections.map((section, i) => (
              <div
                key={section.key}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < sectionIndex
                    ? section.status === 'green' ? 'bg-[var(--status-green)]' :
                      section.status === 'amber' ? 'bg-[var(--status-amber)]' : 'bg-[var(--status-red)]'
                    : i === sectionIndex
                    ? 'bg-[var(--expedia-navy)]'
                    : 'bg-[var(--border-color)]'
                }`}
                title={section.name}
              />
            ))}
          </div>
        )}
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
  onUpdateContent,
  onUpdateSuggestion,
  onAcceptSuggestion,
  onNext,
  onBack,
}: {
  section: Section;
  sectionIndex: number;
  totalSections: number;
  loading: boolean;
  onReassess: (info: string) => void;
  onUpdateContent: (content: string) => void;
  onUpdateSuggestion: (suggestion: string) => void;
  onAcceptSuggestion: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Get the previous section name for back button label
  const getPreviousSectionName = () => {
    if (sectionIndex === 0) return 'Triage';
    const prevSectionKey = SECTION_KEYS[sectionIndex - 1];
    return prevSectionKey ? SECTION_CONFIG[prevSectionKey]?.name : 'Previous';
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackButton onClick={onBack} label={`Back to ${getPreviousSectionName()}`} />

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
          style={{ minHeight: '180px' }}
          value={section.content || '(No content found in brief)'}
          onChange={(e) => onUpdateContent(e.target.value)}
        />
        {section.feedback && (
          <div className={`p-4 rounded-xl border-l-4 ${
            section.status === 'green'
              ? 'bg-[var(--status-green)]/10 border-[var(--status-green)]'
              : section.status === 'amber'
              ? 'bg-[var(--status-amber)]/10 border-[var(--status-amber)]'
              : 'bg-[var(--status-red)]/10 border-[var(--status-red)]'
          }`}>
            <p className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <span className="text-lg">
                {section.status === 'green' ? '✓' : section.status === 'amber' ? '!' : '✗'}
              </span>
              AI Analysis
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed">{section.feedback}</p>

            {/* Questions to help improve the section */}
            {section.questions && section.questions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-current/10">
                <p className="font-medium text-[var(--text-primary)] text-sm mb-2">
                  Questions to help improve this section:
                </p>
                <ul className="space-y-1.5">
                  {section.questions.map((question, idx) => (
                    <li key={idx} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                      <span className="text-[var(--text-muted)]">•</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {section.status !== 'green' && (
              <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-current/10">
                💡 Answer the questions above in the text box below, then click "Re-assess with Info"
              </p>
            )}
          </div>
        )}
      </div>

      {/* AI Suggestion */}
      {section.suggestion && (
        <div className="space-y-3 p-5 rounded-xl bg-[var(--expedia-navy)]/5 border border-[var(--expedia-navy)]/20">
          <label className="block text-sm font-medium text-[var(--expedia-navy)]">
            AI Suggestion
          </label>
          <textarea
            aria-label={`AI suggestion for ${section.name}`}
            className="textarea-field border-[var(--expedia-navy)]/30"
            style={{ minHeight: '180px' }}
            value={section.suggestion}
            onChange={(e) => onUpdateSuggestion(e.target.value)}
          />
          <div className="flex gap-3">
            <button onClick={onAcceptSuggestion} className="btn-secondary text-sm px-4 py-2">
              Accept Suggestion
            </button>
            <button
              onClick={() => onUpdateSuggestion('')}
              className="btn-outline text-sm px-4 py-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* AI Tools - available for ALL sections including green */}
      <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-secondary)]">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Add extra context to improve this section
        </label>
        <textarea
          aria-label="Additional information for this section"
          className="textarea-field"
          style={{ minHeight: '120px' }}
          placeholder="Paste additional context, client notes, website content, or other information that could help improve this section..."
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
        />
        <button
          onClick={() => onReassess(additionalInfo)}
          disabled={loading || !additionalInfo.trim()}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
        >
          {loading && <Spinner className="text-white" />}
          Re-assess with Info
        </button>
      </div>

      {/* Continue Button */}
      <div className="pt-4">
        <button onClick={onNext} className="btn-secondary flex items-center gap-2">
          {sectionIndex < totalSections - 1 ? 'Confirm & Continue' : 'Finish Sections'}
          <span>→</span>
        </button>
      </div>
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

  // Navigation handler for progress bar
  const handleNavigateToStep = (step: Step) => {
    if (step === 'upload') {
      setState(createInitialState());
      return;
    }
    updateState({ step });
    if (step === 'sections') {
      updateState({ currentSectionIndex: 0 });
    }
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

      const data: EnhancedTriageResponse = await response.json();

      // Defensive: ensure triageAssessment is an array
      const triageAssessment = Array.isArray(data.triageAssessment) ? data.triageAssessment : [];

      // Transform EnhancedTriageResponse into Section[] for UI
      const sections: Section[] = triageAssessment.map((result) => ({
        key: result.key,
        name: SECTION_CONFIG[result.key]?.name || result.key,
        status: result.status || 'red',
        // Prefer verbatimQuotes (actual brief content) over synthesizedContent (AI interpretation)
        content: result.verbatimQuotes?.length
          ? result.verbatimQuotes.join('\n\n')
          : result.synthesizedContent || '',
        feedback: (result.whyThisRating || '') + (result.whatNeeded ? `\n\nNeeded: ${result.whatNeeded}` : ''),
        questions: result.questions || [],
        gaps: [...(result.contradictions || []), ...(result.vagueness || [])],
      }));

      // If no sections came back, something went wrong
      if (sections.length === 0) {
        throw new Error('No sections returned from triage');
      }

      updateState({
        sections,
        triageResult: data,
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
        questions: data.questions,
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

  const handleGenerateAudience = async (feedback?: string) => {
    // Update step immediately so progress bar shows Audience during loading
    updateState({ loading: true, error: null, step: 'audience' });
    setLastAction(() => () => handleGenerateAudience(feedback));

    try {
      const response = await fetch('/api/generate/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          additionalContext: state.additionalContext,
          feedback,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate audience options');

      const data: AudienceSegmentMenu = await response.json();
      updateState({
        audienceMenu: data,
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  const handleSelectAudience = async (segment: AudienceSegment) => {
    updateState({ loading: true, error: null, selectedAudienceSegment: segment });
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

      const data: PersonificationResponse = await response.json();
      updateState({
        personification: data,
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
    if (!state.selectedAudienceSegment || !state.personification) return;

    // Update step immediately so progress bar shows Truths during loading
    updateState({ loading: true, error: null, step: 'truths' });
    setLastAction(() => handleGenerateTruths);

    try {
      const response = await fetch('/api/generate/truths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: state.selectedAudienceSegment,
          personification: state.personification.narrative,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate truths');

      const data: TruthsResponse = await response.json();
      updateState({
        truthOptions: data.truths,
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
          audience: state.selectedAudienceSegment,
          personification: state.personification?.narrative || '',
          selectedTruths: state.selectedTruths,
        }),
      });

      if (!response.ok) throw new Error('Failed to compile output');

      const data: OutputResponse = await response.json();

      // Store markdown for inline display
      updateState({
        step: 'output',
        loading: false,
        outputMarkdown: data.markdown,
      });
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
    if (currentSection.key === 'audience' && !state.audienceMenu) {
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

  const goToPreviousSection = () => {
    if (state.currentSectionIndex > 0) {
      updateState({ currentSectionIndex: state.currentSectionIndex - 1 });
    } else {
      updateState({ step: 'triage' });
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
            Upload a document or paste your brief below. I'll assess each section, highlighting what's strong and what needs work.
          </p>
        </div>

        {/* File Upload */}
        <FileUpload
          onFileContent={(content) => updateState({ brief: content, error: null })}
          disabled={state.loading}
        />

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

  const renderTriageStep = () => {
    // Calculate recommendation based on section statuses
    const redSections = state.sections.filter(s => s.status === 'red');
    const amberSections = state.sections.filter(s => s.status === 'amber');
    const greenSections = state.sections.filter(s => s.status === 'green');

    let recommendation = '';
    let recommendationPriority: 'red' | 'amber' | 'green' = 'green';

    if (redSections.length > 0) {
      recommendationPriority = 'red';
      if (redSections.length === 1) {
        recommendation = `Critical gap: ${redSections[0].name} is missing. ${redSections[0].feedback || 'This section needs content before proceeding.'}`;
      } else {
        recommendation = `Critical gaps in ${redSections.length} sections: ${redSections.map(s => s.name).join(', ')}. Consider gathering more information on these before continuing.`;
      }
    } else if (amberSections.length > 0) {
      recommendationPriority = 'amber';
      recommendation = `${amberSections.length} section${amberSections.length > 1 ? 's need' : ' needs'} improvement: ${amberSections.map(s => s.name).join(', ')}. Adding more detail will strengthen your Pitch Pack.`;
    } else {
      recommendationPriority = 'green';
      recommendation = `Your brief covers all sections well. You can still refine each section as you go through.`;
    }

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <BackButton onClick={() => handleNavigateToStep('upload')} label="Back to Upload" />

        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Initial Assessment
          </h2>
          <p className="text-[var(--text-secondary)]">
            Here's my review of your brief across the 8 Pitch Pack sections.
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

        {/* Recommendation Summary */}
        <div className={`p-4 rounded-xl border-l-4 ${
          recommendationPriority === 'red'
            ? 'bg-[var(--status-red-bg)] border-[var(--status-red)]'
            : recommendationPriority === 'amber'
            ? 'bg-[var(--status-amber)]/10 border-[var(--status-amber)]'
            : 'bg-[var(--status-green)]/10 border-[var(--status-green)]'
        }`}>
          <p className="font-medium text-[var(--text-primary)] mb-1">
            {recommendationPriority === 'red' ? '⚠️ Recommendation' :
             recommendationPriority === 'amber' ? '💡 Recommendation' : '✓ Looking Good'}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">{recommendation}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {greenSections.length} good · {amberSections.length} needs work · {redSections.length} missing
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[var(--bg-secondary)]">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Before we go section by section...
          </label>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Do you have any additional context? (Other documents, website content, client notes)
          </p>
          <textarea
            aria-label="Additional context for the brief"
            className="textarea-field"
            style={{ minHeight: '140px' }}
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
  };

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
        onUpdateContent={updateSectionContent}
        onUpdateSuggestion={updateSectionSuggestion}
        onAcceptSuggestion={acceptSuggestion}
        onNext={goToNextSection}
        onBack={goToPreviousSection}
      />
    );
  };

  const renderAudienceStep = () => {
    // Loading state for audience generation
    if (state.loading && !state.audienceMenu) {
      return (
        <LoadingOverlay
          message="Generating audience segments..."
          subMessage="Creating 5 distinct audience profiles based on your brief"
        />
      );
    }

    // Loading state for personification
    if (state.loading && state.selectedAudienceSegment && !state.personification) {
      return (
        <LoadingOverlay
          message={`Developing ${state.selectedAudienceSegment.name}...`}
          subMessage="Creating a rich personification of this audience segment"
        />
      );
    }

    // Loading state for truths generation
    if (state.loading && state.personification) {
      return (
        <LoadingOverlay
          message="Generating human truths..."
          subMessage="Creating 12 psychological insights for your audience"
        />
      );
    }

    // Personification review using new component
    if (state.selectedAudienceSegment && state.personification) {
      return (
        <PersonificationReview
          segment={state.selectedAudienceSegment}
          personification={state.personification}
          onConfirm={(editedNarrative) => {
            // Update personification with edited narrative
            updateState({
              personification: { ...state.personification!, narrative: editedNarrative },
            });
            handleGenerateTruths();
          }}
          onBack={() => updateState({ selectedAudienceSegment: null, personification: null })}
          loading={state.loading}
        />
      );
    }

    // Segment selection using new component
    if (state.audienceMenu) {
      return (
        <AudienceMenu
          menu={state.audienceMenu}
          onSelect={handleSelectAudience}
          onRegenerate={handleGenerateAudience}
          onBack={() => updateState({ step: 'sections', currentSectionIndex: state.sections.length - 1 })}
          loading={state.loading}
        />
      );
    }

    // Fallback - shouldn't reach here
    return (
      <LoadingOverlay
        message="Preparing audience step..."
        subMessage="Loading audience generation"
      />
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
        {/* Back Button */}
        <BackButton onClick={() => updateState({ step: 'audience' })} label="Back to Audience" />

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
                if (audienceIndex >= 0 && state.selectedAudienceSegment) {
                  updatedSections[audienceIndex] = {
                    ...updatedSections[audienceIndex],
                    status: 'green',
                    content: `**${state.selectedAudienceSegment.name}**\n\n${state.selectedAudienceSegment.needsValues}\n\n${state.personification?.narrative || ''}`,
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

    const handleCopy = async () => {
      if (!state.outputMarkdown) return;
      try {
        await navigator.clipboard.writeText(state.outputMarkdown);
        // Simple feedback - could be improved with toast
        alert('Copied to clipboard!');
      } catch {
        // Clipboard API failed, fall back to download
        handleDownload();
      }
    };

    const handleDownload = () => {
      if (!state.outputMarkdown) return;
      const blob = new Blob([state.outputMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pitch-pack.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Show inline output if we have it
    if (state.outputMarkdown) {
      return (
        <div className="space-y-6">
          {/* Back Button */}
          <BackButton onClick={() => updateState({ step: 'truths', outputMarkdown: null })} label="Back to Truths" />

          <div className="text-center pb-6 border-b border-[var(--border-color)]">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
              Your Pitch Pack
            </h2>
            <p className="text-[var(--text-secondary)]">
              Review your completed Pitch Pack below. Copy or download when ready.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handleCopy} className="btn-secondary flex items-center gap-2">
              <span>📋</span> Copy to Clipboard
            </button>
            <button onClick={handleDownload} className="btn-outline flex items-center gap-2">
              <span>⬇️</span> Download as Markdown
            </button>
          </div>

          {/* Output display */}
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6 overflow-auto max-h-[500px]">
            <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)] font-mono leading-relaxed">
              {state.outputMarkdown}
            </pre>
          </div>

          {/* Start over */}
          <div className="pt-4 border-t border-[var(--border-color)]">
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
    }

    // Pre-export summary
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <BackButton onClick={() => updateState({ step: 'truths' })} label="Back to Truths" />

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
        </div>
      </header>

      {/* Global Progress Bar - always visible after upload */}
      {state.step !== 'upload' && (
        <GlobalProgressBar
          step={state.step}
          sectionIndex={state.currentSectionIndex}
          totalSections={state.sections.length}
          sections={state.sections}
          onNavigate={handleNavigateToStep}
        />
      )}

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
