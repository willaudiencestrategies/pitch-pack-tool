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
    green: { bg: 'bg-green-500', label: 'Good' },
    amber: { bg: 'bg-amber-500', label: 'Needs Work' },
    red: { bg: 'bg-red-500', label: 'Missing' },
  };
  const { bg, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${bg}`}>
      <span className={`w-2 h-2 rounded-full bg-white opacity-60`} />
      {label}
    </span>
  );
}

function Spinner() {
  return <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600" />;
}

function ErrorBanner({
  message,
  onRetry,
  onSkip
}: {
  message: string;
  onRetry: () => void;
  onSkip?: () => void;
}) {
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-700 text-sm mb-3">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
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
    <div className="flex gap-1 mt-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded ${
            i < current ? 'bg-green-500' : i === current ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        />
      ))}
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
  // Step Renderers (PLACEHOLDER - Task 6)
  // ============================================

  const renderUploadStep = () => (
    <div className="text-gray-500 text-center py-12">
      Upload step - to be implemented in Task 6
    </div>
  );

  const renderTriageStep = () => (
    <div className="text-gray-500 text-center py-12">
      Triage step - to be implemented in Task 6
    </div>
  );

  const renderSectionStep = () => (
    <div className="text-gray-500 text-center py-12">
      Section step - to be implemented in Task 6
    </div>
  );

  const renderAudienceStep = () => (
    <div className="text-gray-500 text-center py-12">
      Audience step - to be implemented in Task 6
    </div>
  );

  const renderTruthsStep = () => (
    <div className="text-gray-500 text-center py-12">
      Truths step - to be implemented in Task 6
    </div>
  );

  const renderOutputStep = () => (
    <div className="text-gray-500 text-center py-12">
      Output step - to be implemented in Task 6
    </div>
  );

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <h1 className="text-lg font-semibold">Pitch Pack Tool</h1>
          <p className="text-sm text-gray-500">Brief improvement workflow for E Studio</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
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

        <div className="bg-white rounded-lg border p-6">{renderStep()}</div>
      </main>
    </div>
  );
}
