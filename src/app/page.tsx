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
  AudiencePrioritisation,
  PersonificationResponse,
  OptionLevel,
  SectionOptionsResponse,
  SECTION_CONFIG,
  SECTION_KEYS,
  GATE1_SECTION_KEYS,
  GATE2_SECTION_KEYS,
  BrandAlignment as BrandAlignmentType,
  CreativeTenetsResponse,
} from '@/lib/types';
import { SectionOptions } from '@/components/SectionOptions';
import { AudienceMenu } from '@/components/AudienceMenu';
import { PersonificationReview } from '@/components/PersonificationReview';
import { FileUpload } from '@/components/FileUpload';
import { BrandAlignment } from '@/components/BrandAlignment';
import { GateTransition } from '@/components/GateTransition';
import { CreativeTenets } from '@/components/CreativeTenets';
import { GoodExamplePrompt } from '@/components/GoodExamplePrompt';

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
  currentGate,
  onNavigate,
}: {
  step: string;
  sectionIndex: number;
  totalSections: number;
  sections: Section[];
  currentGate: 'gate1' | 'gate2' | 'output';
  onNavigate: (step: Step) => void;
}) {
  // Two-gate flow progress steps
  const steps = [
    { key: 'upload', label: 'Upload' },
    { key: 'triage', label: 'Triage' },
    { key: 'gate1_sections', label: 'Gate 1' },
    { key: 'gate_transition', label: 'Transition' },
    { key: 'gate2_brand', label: 'Brand' },
    { key: 'gate2_audience', label: 'Audience' },
    { key: 'gate2_insights', label: 'Insights' },
    { key: 'gate2_tenets', label: 'Tenets' },
    { key: 'gate2_media', label: 'Media' },
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

        {/* Section sub-progress when in Gate 1 sections step */}
        {step === 'gate1_sections' && sections.length > 0 && (
          <div className="flex gap-1 mt-2">
            {/* Only show Gate 1 sections in sub-progress */}
            {sections
              .filter((s) => GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number]))
              .map((section, i) => (
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
  onReassess: (info: string) => Promise<void>;
  onUpdateContent: (content: string) => void;
  onUpdateSuggestion: (suggestion: string) => void;
  onAcceptSuggestion: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [reassessSuccess, setReassessSuccess] = useState(false);

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

      {/* Good Example Prompt - expandable guidance */}
      <GoodExamplePrompt sectionKey={section.key} />

      {/* Section-specific guidance */}
      {section.status !== 'green' && (
        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] text-sm">
          <p className="font-medium text-[var(--text-primary)] mb-2">How to improve this section:</p>
          <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)]">
            <li>Review the AI Analysis below to understand what's missing</li>
            <li>Add any extra information you have in the text box at the bottom</li>
            <li>Click "Re-assess with Info" to get an updated assessment</li>
            <li>Repeat until you're happy, then click "Confirm & Continue"</li>
          </ol>
        </div>
      )}

      {/* Creative Tenets special note */}
      {section.key === 'creative_tenets' && (
        <div className="p-4 rounded-lg bg-[var(--expedia-navy)]/5 border border-[var(--expedia-navy)]/20 text-sm">
          <p className="font-medium text-[var(--expedia-navy)] mb-1">
            Note: Creative Tenets are generated, not extracted
          </p>
          <p className="text-[var(--text-secondary)]">
            Unlike other sections, Creative Tenets are typically not in the original brief.
            They're strategic principles we'll help you develop based on everything we've
            learned so far. The content below is a starting point for you to refine.
          </p>
        </div>
      )}

      {/* Research Stimuli note */}
      {section.key === 'research_stimuli' && (
        <div className="p-4 rounded-lg bg-[var(--status-amber)]/10 border border-[var(--status-amber)]/30 text-sm">
          <p className="font-medium text-[var(--status-amber)] mb-1">
            Note: URLs are extracted, not verified
          </p>
          <p className="text-[var(--text-secondary)]">
            Any URLs shown below were extracted from the brief. We haven't checked if they
            still work or verified their content. Please check any links before including
            them in your final Pitch Pack.
          </p>
        </div>
      )}

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
            <button onClick={onAcceptSuggestion} className="btn-secondary text-sm px-5 py-2.5">
              Use this suggestion
            </button>
            <button
              onClick={() => onUpdateSuggestion('')}
              className="btn-outline text-sm px-5 py-2.5"
            >
              Keep current
            </button>
          </div>
        </div>
      )}

      {/* AI Tools - available for ALL sections including green */}
      <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-secondary)]">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Tell me more
        </label>
        <textarea
          aria-label="Additional information for this section"
          className="textarea-field"
          style={{ minHeight: '120px' }}
          placeholder="Add any extra context, client notes, or information that could help improve this section..."
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
        />
        <button
          onClick={async () => {
            await onReassess(additionalInfo);
            setAdditionalInfo('');  // Clear input
            setReassessSuccess(true);
            setTimeout(() => setReassessSuccess(false), 3000);  // Hide after 3s
          }}
          disabled={loading || !additionalInfo.trim()}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
        >
          {loading && <Spinner className="text-white" />}
          Re-assess with Info
        </button>
        {reassessSuccess && (
          <p className="text-sm text-[var(--status-green)] mt-2 flex items-center gap-1">
            <span>✓</span> Re-assessment complete - check the suggestion above
          </p>
        )}
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
    // Update gate based on step
    if (step === 'triage' || step === 'gate1_sections') {
      updateState({ currentGate: 'gate1' });
    } else if (step.startsWith('gate2_') || step === 'gate_transition') {
      updateState({ currentGate: 'gate2' });
    } else if (step === 'output') {
      updateState({ currentGate: 'output' });
    }
    // Reset section index for gate1 sections
    if (step === 'gate1_sections') {
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
        // content stays as-is until user accepts suggestion
        feedback: data.feedback,
        suggestion: data.suggestion,  // This shows in the suggestion box
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
    updateState({ loading: true, error: null, step: 'gate2_audience' });
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

  const handleSelectAudience = async (segments: AudienceSegment[], prioritisation: AudiencePrioritisation) => {
    // Primary audience gets full persona treatment
    // Secondary audiences are captured but only names appear in output
    const primarySegment = prioritisation.primary;
    const secondarySegments = prioritisation.secondary;

    updateState({
      loading: true,
      error: null,
      selectedAudienceSegment: primarySegment,
      audiencePrioritisation: prioritisation,
    });
    setLastAction(() => () => handleSelectAudience(segments, prioritisation));

    try {
      const response = await fetch('/api/generate/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          additionalContext: state.additionalContext,
          selectedSegment: primarySegment,
          secondarySegments: secondarySegments.map(s => s.name), // Names only for secondary
          isMerged: false, // No longer merging - using prioritisation instead
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

  const handleGenerateInsights = async () => {
    if (!state.selectedAudienceSegment || !state.personification) return;

    // Update step immediately so progress bar shows Insights during loading
    updateState({ loading: true, error: null, step: 'gate2_insights' });
    setLastAction(() => handleGenerateInsights);

    try {
      const response = await fetch('/api/generate/truths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: state.selectedAudienceSegment,
          personification: state.personification.narrative,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate insights');

      const data: TruthsResponse = await response.json();
      updateState({
        insightOptions: data.truths,
        loading: false,
      });
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
    }
  };

  // Brand Alignment handler (Gate 2)
  const handleBrandAlignment = (alignment: BrandAlignmentType) => {
    updateState({
      brandAlignment: alignment,
      step: 'gate2_audience',
    });
  };

  // Generate Creative Tenets (Gate 2)
  const handleGenerateTenets = async (): Promise<CreativeTenetsResponse> => {
    if (!state.selectedAudienceSegment || state.selectedInsights.length === 0) {
      throw new Error('Audience and insights required');
    }

    updateState({ loading: true, error: null });
    setLastAction(() => () => handleGenerateTenets());

    try {
      // Get objective from sections
      const objectiveSection = state.sections.find((s) => s.key === 'objective');
      const objective = objectiveSection?.content || '';

      const response = await fetch('/api/generate/tenets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.brief,
          objective,
          audience: state.selectedAudienceSegment,
          insights: state.selectedInsights,
          additionalContext: state.additionalContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate tenets');

      const data: CreativeTenetsResponse = await response.json();
      updateState({ loading: false });
      return data;
    } catch (err) {
      updateState({
        error: err instanceof Error ? err.message : 'Something went wrong',
        loading: false,
      });
      throw err;
    }
  };

  // Confirm tenets and continue to media step
  const handleConfirmTenets = (tenets: string[]) => {
    // Update the creative_tenets section with the confirmed tenets
    const updatedSections = [...state.sections];
    const tenetsIndex = updatedSections.findIndex((s) => s.key === 'creative_tenets');
    if (tenetsIndex >= 0) {
      updatedSections[tenetsIndex] = {
        ...updatedSections[tenetsIndex],
        status: 'green',
        content: tenets.map((t, i) => `${i + 1}. ${t}`).join('\n'),
      };
    }

    updateState({
      sections: updatedSections,
      step: 'gate2_media',
    });
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
          selectedInsights: state.selectedInsights,
          includeResearchStimuli: state.includeResearchStimuli,
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

  // Navigation helpers for two-gate flow
  const goToNextGate1Section = () => {
    // Get only Gate 1 sections
    const gate1Sections = state.sections.filter((s) =>
      GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
    );
    const nextIndex = state.currentSectionIndex + 1;

    if (nextIndex < gate1Sections.length) {
      updateState({ currentSectionIndex: nextIndex });
    } else {
      // Finished Gate 1, go to transition
      updateState({ step: 'gate_transition' });
    }
  };

  const goToPreviousGate1Section = () => {
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
    // Filter to only Gate 1 sections for triage display
    const gate1Sections = state.sections.filter((s) =>
      GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
    );

    // Calculate recommendation based on Gate 1 section statuses only
    const redSections = gate1Sections.filter(s => s.status === 'red');
    const amberSections = gate1Sections.filter(s => s.status === 'amber');
    const greenSections = gate1Sections.filter(s => s.status === 'green');

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
      recommendation = `Your brief covers the core Gate 1 sections well. You can still refine each section as you go through.`;
    }

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <BackButton onClick={() => handleNavigateToStep('upload')} label="Back to Upload" />

        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Gate 1: Brief Assessment
          </h2>
          <p className="text-[var(--text-secondary)]">
            Here's my review of the core brief elements. We'll build the creative brief in Gate 2.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
          {gate1Sections.map((section, index) => (
            <div
              key={section.key}
              className={`flex items-center justify-between p-4 ${
                index !== gate1Sections.length - 1 ? 'border-b border-[var(--border-color)]' : ''
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
            Before we continue, gather more context
          </label>
          <div className="text-sm text-[var(--text-muted)] mb-4 space-y-2">
            <p>To get the best results, consider checking:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The destination's official website and YouTube channel</li>
              <li>Recent press releases or news articles</li>
              <li>Competitor campaigns or positioning</li>
              <li>Any existing research or customer insights</li>
              <li>Previous campaign materials or brand guidelines</li>
            </ul>
            <p className="pt-2">Paste anything useful below:</p>
          </div>
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
          onClick={() => updateState({ step: 'gate1_sections', currentSectionIndex: 0, currentGate: 'gate1' })}
          className="btn-secondary flex items-center gap-2 w-full justify-center"
        >
          Review Gate 1 Sections
          <span>→</span>
        </button>
      </div>
    );
  };

  const renderGate1SectionStep = () => {
    // Get only Gate 1 sections
    const gate1Sections = state.sections.filter((s) =>
      GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
    );
    const section = gate1Sections[state.currentSectionIndex];

    if (!section) {
      // Safety check - should not happen
      return null;
    }

    return (
      <SectionStepContent
        key={section.key}
        section={section}
        sectionIndex={state.currentSectionIndex}
        totalSections={gate1Sections.length}
        loading={state.loading}
        onReassess={handleSectionReassess}
        onUpdateContent={updateSectionContent}
        onUpdateSuggestion={updateSectionSuggestion}
        onAcceptSuggestion={acceptSuggestion}
        onNext={goToNextGate1Section}
        onBack={goToPreviousGate1Section}
      />
    );
  };

  // Gate Transition step renderer
  const renderGateTransitionStep = () => {
    return (
      <GateTransition
        sections={state.sections}
        onContinue={() => updateState({ step: 'gate2_brand', currentGate: 'gate2' })}
        onBack={() => {
          // Go back to last Gate 1 section
          const gate1Sections = state.sections.filter((s) =>
            GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
          );
          updateState({
            step: 'gate1_sections',
            currentSectionIndex: gate1Sections.length - 1,
          });
        }}
      />
    );
  };

  // Brand Alignment step renderer (Gate 2)
  const renderBrandAlignmentStep = () => {
    return (
      <BrandAlignment
        onConfirm={handleBrandAlignment}
        onBack={() => updateState({ step: 'gate_transition' })}
        initialValue={state.brandAlignment}
      />
    );
  };

  // Creative Tenets step renderer (Gate 2)
  const renderCreativeTenetsStep = () => {
    if (!state.selectedAudienceSegment || state.selectedInsights.length === 0) {
      // Redirect back to insights if missing required data
      updateState({ step: 'gate2_insights' });
      return null;
    }

    return (
      <CreativeTenets
        audience={state.selectedAudienceSegment}
        insights={state.selectedInsights}
        onConfirm={handleConfirmTenets}
        onBack={() => updateState({ step: 'gate2_insights' })}
        onGenerate={handleGenerateTenets}
        loading={state.loading}
      />
    );
  };

  // Media Context step renderer (Gate 2)
  const renderMediaContextStep = () => {
    // Get the media_context section
    const mediaSection = state.sections.find((s) => s.key === 'media_context');

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => updateState({ step: 'gate2_tenets' })}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
        >
          ← Back to Tenets
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
            Gate 2: Step 5
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Media Context
          </h2>
          <p className="text-[var(--text-secondary)]">
            Add any media context the CP has provided. This is not AI-generated.
          </p>
        </div>

        {/* Good Example */}
        <GoodExamplePrompt sectionKey="media_context" />

        {/* Media Context Input */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Media Context
          </label>
          <textarea
            aria-label="Media context"
            className="textarea-field"
            style={{ minHeight: '180px' }}
            placeholder="Enter any media context provided by the CP (channels, timing, markets, DG match details)..."
            value={mediaSection?.content || ''}
            onChange={(e) => {
              const updatedSections = [...state.sections];
              const mediaIndex = updatedSections.findIndex((s) => s.key === 'media_context');
              if (mediaIndex >= 0) {
                updatedSections[mediaIndex] = {
                  ...updatedSections[mediaIndex],
                  content: e.target.value,
                  status: e.target.value.trim() ? 'green' : 'amber',
                };
                updateState({ sections: updatedSections });
              }
            }}
          />
          <p className="text-xs text-[var(--text-muted)]">
            This section captures what the CP knows about media direction. It's not a detailed media plan.
          </p>
        </div>

        {/* Research Stimuli Toggle */}
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={state.includeResearchStimuli}
                onChange={(e) => updateState({ includeResearchStimuli: e.target.checked })}
                className="h-5 w-5 rounded border-[var(--border-color)] accent-[var(--expedia-navy)] cursor-pointer"
              />
            </div>
            <div>
              <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--expedia-navy)] transition-colors">
                Include Research Stimuli
              </span>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Include any URLs and research materials extracted from the brief as an appendix.
              </p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-[var(--border-color)] flex gap-3">
          <button
            onClick={() => updateState({ step: 'output', currentGate: 'output' })}
            className="btn-secondary flex items-center gap-2"
          >
            <span>Finish & Generate Output</span>
            <span>→</span>
          </button>
          <button
            onClick={() => updateState({ step: 'gate2_tenets' })}
            className="btn-outline"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  };

  const renderGate2AudienceStep = () => {
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

    // Loading state for insights generation
    if (state.loading && state.personification) {
      return (
        <LoadingOverlay
          message="Generating audience insights..."
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
            handleGenerateInsights();
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
          onBack={() => updateState({ step: 'gate2_brand' })}
          loading={state.loading}
        />
      );
    }

    // Auto-trigger audience generation if no menu yet
    if (!state.loading && !state.audienceMenu) {
      handleGenerateAudience();
    }

    // Fallback - shouldn't reach here
    return (
      <LoadingOverlay
        message="Preparing audience step..."
        subMessage="Loading audience generation"
      />
    );
  };

  const renderInsightsStep = () => {
    if (state.loading && state.insightOptions.length === 0) {
      return (
        <LoadingOverlay
          message="Generating audience insights..."
          subMessage="Creating 12 psychological insights across safer, sharper, and bolder levels"
        />
      );
    }

    const toggleInsight = (insight: Truth) => {
      const isSelected = state.selectedInsights.some((t) => t.id === insight.id);
      if (isSelected) {
        updateState({
          selectedInsights: state.selectedInsights.filter((t) => t.id !== insight.id),
        });
      } else {
        // Limit to max 3 insights
        if (state.selectedInsights.length >= 3) {
          return; // Don't add more than 3
        }
        updateState({
          selectedInsights: [...state.selectedInsights, insight],
        });
      }
    };

    const updateInsightText = (id: number, text: string) => {
      const updatedInsights = state.insightOptions.map((t) => (t.id === id ? { ...t, text } : t));
      updateState({ insightOptions: updatedInsights });

      // Also update in selected if present
      const updatedSelected = state.selectedInsights.map((t) => (t.id === id ? { ...t, text } : t));
      updateState({ selectedInsights: updatedSelected });
    };

    // Display order: Bolder first, then Sharper, then Safer
    const insightsByLevel = {
      bolder: state.insightOptions.filter((t) => t.level === 'bolder'),
      sharper: state.insightOptions.filter((t) => t.level === 'sharper'),
      safer: state.insightOptions.filter((t) => t.level === 'safer'),
    };

    const levelLabels = {
      bolder: { label: 'Bolder', desc: 'Provocative, high impact', color: 'var(--status-red)' },
      sharper: { label: 'Sharper', desc: 'Clearer trade-offs, more distinctive', color: 'var(--status-amber)' },
      safer: { label: 'Safer', desc: 'Broad appeal, easy to execute', color: 'var(--status-green)' },
    };

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <BackButton onClick={() => updateState({ step: 'gate2_audience' })} label="Back to Audience" />

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
            Gate 2: Step 3
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Select Audience Insights
          </h2>
          <p className="text-[var(--text-secondary)]">
            12 insights ranging from bolder to safer. Select up to 3 that resonate with your audience.
          </p>
        </div>

        {/* Selection count indicator */}
        <div className={`p-3 rounded-lg text-center ${
          state.selectedInsights.length === 3
            ? 'bg-[var(--status-green)]/10 border border-[var(--status-green)]'
            : 'bg-[var(--bg-secondary)]'
        }`}>
          <span className="text-sm font-medium">
            {state.selectedInsights.length}/3 insights selected
          </span>
          {state.selectedInsights.length === 3 && (
            <span className="text-sm text-[var(--status-green)] ml-2">Maximum reached</span>
          )}
        </div>

        {/* Good Example */}
        <GoodExamplePrompt sectionKey="audience_insights" />

        {(['bolder', 'sharper', 'safer'] as const).map((level) => (
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
              {insightsByLevel[level].map((insight) => {
                const isSelected = state.selectedInsights.some((t) => t.id === insight.id);
                const isDisabled = !isSelected && state.selectedInsights.length >= 3;
                return (
                  <div
                    key={insight.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5'
                        : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'
                    }`}
                    onClick={() => !isDisabled && toggleInsight(insight)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleInsight(insight)}
                      className="mt-1 h-4 w-4 accent-[var(--expedia-navy)]"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={insight.text}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateInsightText(insight.id, e.target.value);
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
            {state.selectedInsights.length} selected (max 3)
          </span>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateInsights}
              disabled={state.loading}
              className="btn-outline text-sm px-5 py-2.5"
            >
              Regenerate
            </button>
            <button
              onClick={() => {
                // Update the audience_insights section and continue to tenets
                const updatedSections = [...state.sections];
                const insightsIndex = updatedSections.findIndex((s) => s.key === 'audience_insights');
                if (insightsIndex >= 0) {
                  updatedSections[insightsIndex] = {
                    ...updatedSections[insightsIndex],
                    status: 'green',
                    content: state.selectedInsights.map((t) => `- ${t.text}`).join('\n'),
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
                  step: 'gate2_tenets',
                });
              }}
              disabled={state.selectedInsights.length === 0}
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

    const navigateToSection = (sectionKey: string) => {
      // Determine which gate the section belongs to
      const isGate1 = GATE1_SECTION_KEYS.includes(sectionKey as typeof GATE1_SECTION_KEYS[number]);
      const isGate2 = GATE2_SECTION_KEYS.includes(sectionKey as typeof GATE2_SECTION_KEYS[number]);

      if (isGate1) {
        const gate1Sections = state.sections.filter((s) =>
          GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
        );
        const sectionIndex = gate1Sections.findIndex(s => s.key === sectionKey);
        if (sectionIndex >= 0) {
          updateState({
            step: 'gate1_sections',
            currentSectionIndex: sectionIndex,
            currentGate: 'gate1',
            outputMarkdown: null,
          });
        }
      } else if (isGate2) {
        // For Gate 2 sections, navigate to the appropriate step
        switch (sectionKey) {
          case 'brand_alignment':
            updateState({ step: 'gate2_brand', currentGate: 'gate2', outputMarkdown: null });
            break;
          case 'audience_insights':
            updateState({ step: 'gate2_insights', currentGate: 'gate2', outputMarkdown: null });
            break;
          case 'creative_tenets':
            updateState({ step: 'gate2_tenets', currentGate: 'gate2', outputMarkdown: null });
            break;
          case 'media_context':
            updateState({ step: 'gate2_media', currentGate: 'gate2', outputMarkdown: null });
            break;
        }
      }
    };

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
          <BackButton onClick={() => updateState({ step: 'gate2_media', outputMarkdown: null })} label="Back to Media" />

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
    const getStatusSummary = () => {
      const red = state.sections.filter(s => s.status === 'red');
      const amber = state.sections.filter(s => s.status === 'amber');
      const green = state.sections.filter(s => s.status === 'green');
      return { red, amber, green };
    };

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <BackButton onClick={() => updateState({ step: 'gate2_media' })} label="Back to Media" />

        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Pitch Pack Complete
          </h2>
          <p className="text-[var(--text-secondary)]">
            All sections reviewed. Ready to compile your final Pitch Pack.
          </p>
        </div>

        {/* Status Summary */}
        {(() => {
          const { red, amber, green } = getStatusSummary();
          const hasIssues = red.length > 0 || amber.length > 0;

          return (
            <div className={`p-4 rounded-xl border-l-4 mb-6 ${
              red.length > 0
                ? 'bg-[var(--status-red-bg)] border-[var(--status-red)]'
                : amber.length > 0
                ? 'bg-[var(--status-amber)]/10 border-[var(--status-amber)]'
                : 'bg-[var(--status-green)]/10 border-[var(--status-green)]'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {red.length > 0 ? '⚠️' : amber.length > 0 ? '💡' : '✓'}
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {red.length > 0
                    ? 'Some sections need attention'
                    : amber.length > 0
                    ? 'Almost there'
                    : 'Looking good!'}
                </span>
              </div>

              <div className="text-sm text-[var(--text-secondary)] space-y-1">
                {red.length > 0 && (
                  <p>
                    <span className="font-medium text-[var(--status-red)]">Missing ({red.length}):</span>{' '}
                    {red.map(s => s.name).join(', ')}
                  </p>
                )}
                {amber.length > 0 && (
                  <p>
                    <span className="font-medium text-[var(--status-amber)]">Needs work ({amber.length}):</span>{' '}
                    {amber.map(s => s.name).join(', ')}
                  </p>
                )}
                {green.length > 0 && (
                  <p>
                    <span className="font-medium text-[var(--status-green)]">Good ({green.length}):</span>{' '}
                    {green.map(s => s.name).join(', ')}
                  </p>
                )}
              </div>

              {hasIssues && (
                <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-current/10">
                  Click any section below to go back and improve it
                </p>
              )}
            </div>
          );
        })()}

        <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
          {state.sections.map((section, index) => (
            <div
              key={section.key}
              onClick={() => navigateToSection(section.key)}
              className={`p-4 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors ${
                index !== state.sections.length - 1 ? 'border-b border-[var(--border-color)]' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[var(--text-primary)] hover:underline">{section.name}</span>
                <StatusBadge status={section.status} />
              </div>
              <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                {section.content || '(not provided)'}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] text-center mt-2">
          Click any section to go back and edit it
        </p>

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
      case 'gate1_sections':
        return renderGate1SectionStep();
      case 'gate_transition':
        return renderGateTransitionStep();
      case 'gate2_brand':
        return renderBrandAlignmentStep();
      case 'gate2_audience':
        return renderGate2AudienceStep();
      case 'gate2_insights':
        return renderInsightsStep();
      case 'gate2_tenets':
        return renderCreativeTenetsStep();
      case 'gate2_media':
        return renderMediaContextStep();
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
          totalSections={state.sections.filter((s) =>
            GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
          ).length}
          sections={state.sections}
          currentGate={state.currentGate}
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
              if (state.step === 'gate1_sections') goToNextGate1Section();
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
