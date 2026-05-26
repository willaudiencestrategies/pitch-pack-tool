// src/app/page.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  SessionState,
  Section,
  Step,
  createInitialState,
  GATE1_SECTION_KEYS,
  HistoryEntry,
} from '@/lib/types';
import {
  saveSession,
  loadSession,
  clearSession,
  getSessionSavedAt,
  getSessionTimeRemaining,
} from '@/lib/session-storage';
import { BriefStateProvider, BriefStateContextValue } from '@/lib/state/BriefStateContext';
import { useHandlers } from '@/lib/state/useHandlers';
import { useProgressHooks } from '@/lib/state/useProgressHooks';
import { decodeResumeToken } from '@/lib/vault-resume-token';
import { UploadStep } from '@/components/steps/UploadStep';
import { TellMeMoreStep } from '@/components/steps/TellMeMoreStep';
import { TriageStep } from '@/components/steps/TriageStep';
import { Gate1SectionsStep } from '@/components/steps/Gate1SectionsStep';
import { GateTransitionStep } from '@/components/steps/GateTransitionStep';
import { BrandAlignmentStep } from '@/components/steps/BrandAlignmentStep';
import { Gate2AudienceStep } from '@/components/steps/Gate2AudienceStep';
import { InsightsStep } from '@/components/steps/InsightsStep';
import { CreativeTenetsStep } from '@/components/steps/CreativeTenetsStep';
import { VaultDecisionStep } from '@/components/steps/VaultDecisionStep';
import { VaultAudiencePickerStep } from '@/components/steps/VaultAudiencePickerStep';
import { VaultProductionBudgetStep } from '@/components/steps/VaultProductionBudgetStep';
import { VaultMatchListStep } from '@/components/steps/VaultMatchListStep';
import { VaultNarrativeDraftStep } from '@/components/steps/VaultNarrativeDraftStep';
import { VaultExportStep } from '@/components/steps/VaultExportStep';
import { MediaContextStep } from '@/components/steps/MediaContextStep';
import { OutputStep } from '@/components/steps/OutputStep';

// ============================================
// Helper Components
// ============================================

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
    <div
      className="mb-6 p-4 rounded-xl bg-[var(--status-red-bg)] border border-[var(--status-red)]"
      style={{ animation: 'shake 0.5s ease-out' }}
    >
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
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

function SaveReminder({ hasUnsavedWork }: { hasUnsavedWork: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  if (!hasUnsavedWork || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 p-4 rounded-xl bg-[var(--expedia-navy)] text-white shadow-lg max-w-xs z-40">
      <div className="flex items-start gap-3">
        <span className="text-lg">💾</span>
        <div>
          <p className="font-medium text-sm">Don&apos;t forget to save</p>
          <p className="text-xs opacity-80 mt-1">
            This tool doesn&apos;t store your work. Download your output before leaving.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/60 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function RestoreSessionPrompt({
  savedAt,
  timeRemaining,
  onRestore,
  onStartFresh,
}: {
  savedAt: string | null;
  timeRemaining: string | null;
  onRestore: () => void;
  onStartFresh: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        {/* Header with gradient accent */}
        <div
          className="h-1"
          style={{
            background: 'linear-gradient(90deg, var(--expedia-navy), var(--expedia-yellow), var(--expedia-navy))',
          }}
        />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--expedia-yellow)' }}
            >
              <span className="text-2xl">📂</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Welcome Back
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                You have an in-progress session{savedAt ? ` saved ${savedAt}` : ''}.
                {timeRemaining && (
                  <span className="block text-xs text-[var(--text-muted)] mt-1">
                    Expires in {timeRemaining}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={onRestore}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <span>Continue where I left off</span>
              <span>→</span>
            </button>
            <button
              onClick={onStartFresh}
              className="btn-outline w-full"
            >
              Start fresh
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// Global progress indicator with sliding focus design
// Current step is prominent with scale animation, completed steps show green checkmarks,
// future steps are muted dots, gradient lines connect steps
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
  currentGate: 'gate1' | 'gate2' | 'output';
  onNavigate: (step: Step) => void;
}) {
  // Two-gate flow progress steps
  const steps = [
    { key: 'upload', label: 'Upload' },
    { key: 'tell_me_more', label: 'Context' },
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

  // Get connecting line style - gradient from completed to pending
  const getLineStyle = (index: number) => {
    const isBeforeCurrent = index < currentStepIndex;
    const isAtCurrent = index === currentStepIndex - 1; // Line leading into current step
    const showLabelContext = shouldShowLabel(index) || shouldShowLabel(index + 1);

    if (isBeforeCurrent && !isAtCurrent) {
      // Fully completed segment - solid green
      return {
        width: showLabelContext ? '1rem' : '0.5rem',
        background: 'var(--status-green)',
      };
    } else if (isAtCurrent) {
      // Transition line - gradient from green to navy
      return {
        width: '1rem',
        background: 'linear-gradient(90deg, var(--status-green), var(--expedia-navy))',
      };
    } else if (index === currentStepIndex) {
      // Line leaving current step - gradient from navy to grey
      return {
        width: showLabelContext ? '1rem' : '0.5rem',
        background: 'linear-gradient(90deg, var(--expedia-navy), var(--border-color))',
      };
    } else {
      // Future segments - grey
      return {
        width: showLabelContext ? '1rem' : '0.5rem',
        background: 'var(--border-color)',
      };
    }
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
                  className={`flex items-center justify-center transition-all duration-200 ${
                    isCurrent
                      ? 'px-4 py-2 rounded-full bg-[var(--expedia-navy)] text-white text-sm font-medium shadow-md'
                      : isCompleted
                      ? showLabel
                        ? 'px-3 py-1.5 rounded-full bg-[var(--status-green)]/15 text-[var(--status-green)] text-xs font-medium cursor-pointer hover:bg-[var(--status-green)]/25 border border-[var(--status-green)]/30'
                        : 'w-6 h-6 rounded-full bg-[var(--status-green)]/15 text-[var(--status-green)] text-xs cursor-pointer hover:bg-[var(--status-green)]/25 border border-[var(--status-green)]/30'
                      : showLabel
                      ? 'px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-xs'
                      : 'w-2 h-2 rounded-full bg-[var(--border-color)]'
                  }`}
                  style={isCurrent ? {
                    transform: 'scale(1.05)',
                    animation: 'pulseActive 2s ease-in-out infinite',
                  } : undefined}
                >
                  {isCompleted && !showLabel && <span className="text-[10px] font-bold">✓</span>}
                  {isCompleted && showLabel && (
                    <>
                      <span className="mr-1 font-bold">✓</span>
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
                  <div
                    className="h-0.5 mx-1 transition-all duration-300 rounded-full"
                    style={getLineStyle(i)}
                  />
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

      {/* Animation keyframes for active step pulse */}
      <style jsx>{`
        @keyframes pulseActive {
          0%, 100% {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          50% {
            box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </div>
  );
}


// ============================================
// Main Component
// ============================================

export default function Home() {
  const [state, setState] = useState<SessionState>(createInitialState());
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [sessionSavedAt, setSessionSavedAt] = useState<string | null>(null);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State update helper
  const updateState = (updates: Partial<SessionState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // ============================================
  // Session Persistence
  // ============================================

  // Resume-token re-entry: check URL for ?resume= on mount BEFORE session restore.
  // If a valid token is present, restore the brief slice, route to gate2_tenets,
  // and clean the URL. Takes precedence over the localStorage restore prompt.
  const resumedFromTokenRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get('resume');
    if (!token) return;

    const slice = decodeResumeToken(token);
    if (!slice) return;

    resumedFromTokenRef.current = true;
    updateState({
      ...slice,
      step: 'gate2_tenets',
      resumedFromToken: true,
    });
    setShowRestorePrompt(false);

    // Clean the URL so refresh doesn't re-trigger
    url.searchParams.delete('resume');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Check for stored session on mount
  useEffect(() => {
    // Skip if a resume token already restored state
    if (resumedFromTokenRef.current) return;
    const stored = loadSession();
    if (stored && stored.state.step !== 'upload') {
      setSessionSavedAt(getSessionSavedAt());
      setSessionTimeRemaining(getSessionTimeRemaining());
      setShowRestorePrompt(true);
    }
  }, []);

  // Auto-save on state changes (debounced 1 second, skip if on upload step)
  useEffect(() => {
    // Skip if on upload step (nothing worth saving yet)
    if (state.step === 'upload') return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(() => {
      saveSession(state);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state]);

  // Restore session from localStorage
  const restoreSession = () => {
    const stored = loadSession();
    if (stored) {
      setState(stored.state);
    }
    setShowRestorePrompt(false);
  };

  // Start fresh (clear stored session)
  const startFresh = () => {
    if (state.briefId) {
      clearSession(state.briefId);
    }
    setShowRestorePrompt(false);
  };

  // ============================================
  // Undo/Redo Functionality
  // ============================================

  // Push a state snapshot to history before destructive actions
  const pushHistory = (action: string, snapshot: Partial<SessionState>) => {
    setState((prev) => {
      // Create history entry
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        action,
        state: snapshot,
      };

      // Trim future history if not at the end (we're branching)
      const trimmedHistory = prev.history.slice(0, prev.historyIndex + 1);

      // Add new entry (max 20 entries)
      const newHistory = [...trimmedHistory, entry].slice(-20);

      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  };

  // ============================================
  // Context bag wiring — progress hooks + handler bag flow through
  // BriefStateProvider to the extracted step components.
  // ============================================
  const progress = useProgressHooks();
  const handlers = useHandlers({
    state,
    updateState,
    progress,
    pushHistory,
    setLastAction,
  });

  // Derived values for undo/redo availability
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  // Undo: restore previous history entry's state
  const undo = () => {
    if (!canUndo) return;

    const previousEntry = state.history[state.historyIndex - 1];
    if (previousEntry) {
      setState((prev) => ({
        ...prev,
        ...previousEntry.state,
        historyIndex: prev.historyIndex - 1,
      }));
    }
  };

  // Redo: restore next history entry's state
  const redo = () => {
    if (!canRedo) return;

    const nextEntry = state.history[state.historyIndex + 1];
    if (nextEntry) {
      setState((prev) => ({
        ...prev,
        ...nextEntry.state,
        historyIndex: prev.historyIndex + 1,
      }));
    }
  };

  // Navigation helpers for two-gate flow (used by FloatingNavButtons and ErrorBanner Skip)
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

  // FloatingNavButtons component - section navigation on Gate 1, undo/redo elsewhere
  function FloatingNavButtons() {
    const isGate1Sections = state.step === 'gate1_sections';
    const gate1Sections = state.sections.filter((s) =>
      GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
    );

    if (isGate1Sections) {
      const canGoBack = state.currentSectionIndex > 0;
      const canGoForward = state.currentSectionIndex < gate1Sections.length - 1;

      return (
        <div className="fixed bottom-4 right-4 flex gap-2 z-40">
          <button
            onClick={goToPreviousGate1Section}
            disabled={!canGoBack}
            className="p-2 rounded-lg bg-white border border-[var(--border-color)] shadow-sm disabled:opacity-40 hover:bg-[var(--bg-secondary)] transition-colors"
            title={canGoBack ? `Back to ${gate1Sections[state.currentSectionIndex - 1]?.name}` : 'First section'}
          >
            ←
          </button>
          <button
            onClick={goToNextGate1Section}
            disabled={!canGoForward}
            className="p-2 rounded-lg bg-white border border-[var(--border-color)] shadow-sm disabled:opacity-40 hover:bg-[var(--bg-secondary)] transition-colors"
            title={canGoForward ? `Next: ${gate1Sections[state.currentSectionIndex + 1]?.name}` : 'Last section'}
          >
            →
          </button>
        </div>
      );
    }

    // Default: undo/redo buttons
    return (
      <div className="fixed bottom-4 right-4 flex gap-2 z-40">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 rounded-lg bg-white border border-[var(--border-color)] shadow-sm disabled:opacity-40 hover:bg-[var(--bg-secondary)] transition-colors"
          title="Undo"
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 rounded-lg bg-white border border-[var(--border-color)] shadow-sm disabled:opacity-40 hover:bg-[var(--bg-secondary)] transition-colors"
          title="Redo"
        >
          ↷
        </button>
      </div>
    );
  }

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
  // Main Render
  // ============================================

  const renderStep = () => {
    switch (state.step) {
      case 'upload':
        return <UploadStep />;
      case 'tell_me_more':
        return <TellMeMoreStep />;
      case 'triage':
        return <TriageStep />;
      case 'gate1_sections':
        return <Gate1SectionsStep />;
      case 'gate_transition':
        return <GateTransitionStep />;
      case 'gate2_brand':
        return <BrandAlignmentStep />;
      case 'gate2_audience':
        return <Gate2AudienceStep />;
      case 'gate2_insights':
        return <InsightsStep />;
      case 'vault_decision':
        return <VaultDecisionStep />;
      case 'vault_audience_picker':
        return <VaultAudiencePickerStep />;
      case 'vault_production_budget':
        return <VaultProductionBudgetStep />;
      case 'vault_matches':
        return <VaultMatchListStep />;
      case 'vault_narrative_draft':
        return <VaultNarrativeDraftStep />;
      case 'vault_export':
        return <VaultExportStep />;
      case 'gate2_tenets':
        return <CreativeTenetsStep />;
      case 'gate2_media':
        return <MediaContextStep />;
      case 'output':
        return <OutputStep />;
      default:
        return <UploadStep />;
    }
  };

  const contextValue: BriefStateContextValue = {
    state,
    updateState,
    handlers,
    progress,
    pushHistory,
    lastAction,
    setLastAction,
  };

  return (
    <BriefStateProvider value={contextValue}>
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <header className="bg-[var(--expedia-navy)] text-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[var(--expedia-yellow)] flex items-center justify-center">
              <span className="text-[var(--expedia-navy)] font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="font-semibold">Creative Brief Builder</h1>
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
        Creative Brief Builder for E Studio
      </footer>

      {/* Floating Navigation / Undo-Redo Buttons */}
      <FloatingNavButtons />

      {/* Save Work Reminder */}
      <SaveReminder hasUnsavedWork={state.step !== 'upload' && state.step !== 'output'} />

      {/* Restore Session Prompt */}
      {showRestorePrompt && (
        <RestoreSessionPrompt
          savedAt={sessionSavedAt}
          timeRemaining={sessionTimeRemaining}
          onRestore={restoreSession}
          onStartFresh={startFresh}
        />
      )}
    </div>
    </BriefStateProvider>
  );
}
