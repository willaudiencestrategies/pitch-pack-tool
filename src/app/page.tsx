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

// This is a placeholder - will be properly implemented in Task 7
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
  return (
    <div className="text-gray-500 text-center py-12">
      Section step content - to be properly implemented in Task 7
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
  // Step Renderers
  // ============================================

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Upload Your Brief</h2>
        <p className="text-gray-600 text-sm">
          Paste the full brief content below. I'll review it and identify what's strong vs what needs work.
        </p>
      </div>

      <textarea
        className="w-full h-64 p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Paste your brief here..."
        value={state.brief}
        onChange={(e) => updateState({ brief: e.target.value })}
      />

      <button
        onClick={handleTriage}
        disabled={state.loading || !state.brief.trim()}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.loading && <Spinner />}
        {state.loading ? 'Assessing...' : 'Upload Brief →'}
      </button>
    </div>
  );

  const renderTriageStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Initial Assessment</h2>
        <p className="text-gray-600 text-sm">Here's my review of your brief:</p>
      </div>

      <div className="border rounded-lg divide-y">
        {state.sections.map((section, index) => (
          <div key={section.key} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-gray-500 font-mono text-sm">{index + 1}.</span>
              <span className="font-medium">{section.name}</span>
            </div>
            <StatusBadge status={section.status} />
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="font-medium mb-2">Before we go section by section:</p>
        <p className="text-gray-600 text-sm mb-3">
          Do you have any additional information to share? (Other documents, website content, notes from client)
        </p>
        <textarea
          className="w-full h-24 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste additional context here (optional)..."
          value={state.additionalContext}
          onChange={(e) => updateState({ additionalContext: e.target.value })}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => updateState({ step: 'sections', currentSectionIndex: 0 })}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Continue to Sections →
        </button>
      </div>
    </div>
  );

  const renderSectionStep = () => {
    const section = state.sections[state.currentSectionIndex];

    return (
      <SectionStepContent
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
    if (state.selectedAudience && state.personification) {
      // Personification review
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Review Personification</h2>
            <p className="text-gray-600 text-sm">
              Here's the expanded audience sketch for <strong>{state.selectedAudience.name}</strong>:
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <textarea
              className="w-full min-h-[200px] p-3 bg-gray-50 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={state.personification}
              onChange={(e) => updateState({ personification: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerateTruths}
              disabled={state.loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {state.loading && <Spinner />}
              Confirm & Generate Human Truths →
            </button>
            <button
              onClick={() => updateState({ selectedAudience: null, personification: '' })}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              ← Back to Segments
            </button>
          </div>
        </div>
      );
    }

    // Segment selection
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Choose Your Audience Segment</h2>
          <p className="text-gray-600 text-sm">
            Based on your brief, here are 5 potential audience segments. Click one to develop further.
          </p>
        </div>

        <div className="space-y-4">
          {state.audienceOptions.map((segment) => (
            <div
              key={segment.id}
              className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
              onClick={() => handleSelectAudience(segment)}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg">{segment.name}</h3>
                {state.loading && state.selectedAudience?.id === segment.id && <Spinner />}
              </div>
              <p className="text-gray-700 mt-1">{segment.description}</p>
              <p className="text-gray-500 text-sm mt-2">{segment.demographics}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerateAudience}
          disabled={state.loading}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
        >
          Regenerate Options
        </button>
      </div>
    );
  };

  const renderTruthsStep = () => {
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
      const updatedTruths = state.truthOptions.map((t) =>
        t.id === id ? { ...t, text } : t
      );
      updateState({ truthOptions: updatedTruths });

      // Also update in selected if present
      const updatedSelected = state.selectedTruths.map((t) =>
        t.id === id ? { ...t, text } : t
      );
      updateState({ selectedTruths: updatedSelected });
    };

    const truthsByLevel = {
      safer: state.truthOptions.filter((t) => t.level === 'safer'),
      sharper: state.truthOptions.filter((t) => t.level === 'sharper'),
      bolder: state.truthOptions.filter((t) => t.level === 'bolder'),
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Human Truths</h2>
          <p className="text-gray-600 text-sm">
            Here are 12 human truths ranging from safer to bolder. Select any that resonate.
          </p>
        </div>

        {(['safer', 'sharper', 'bolder'] as const).map((level) => (
          <div key={level}>
            <h3 className="font-medium text-gray-500 uppercase text-xs tracking-wide mb-2">
              {level === 'safer' ? 'Safer (1-4)' : level === 'sharper' ? 'Sharper (5-8)' : 'Bolder (9-12)'}
            </h3>
            <div className="space-y-2">
              {truthsByLevel[level].map((truth) => {
                const isSelected = state.selectedTruths.some((t) => t.id === truth.id);
                return (
                  <div
                    key={truth.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTruth(truth)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-gray-400 text-sm mr-2">{truth.id}.</span>
                      <input
                        type="text"
                        value={truth.text}
                        onChange={(e) => updateTruthText(truth.id, e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Selected: {state.selectedTruths.length}
          </span>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateTruths}
              disabled={state.loading}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm & Continue →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOutputStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Pitch Pack Complete</h2>
        <p className="text-gray-600 text-sm">
          All sections have been reviewed. Ready to compile the final output.
        </p>
      </div>

      <div className="border rounded-lg divide-y">
        {state.sections.map((section) => (
          <div key={section.key} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{section.name}</span>
              <StatusBadge status={section.status} />
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">
              {section.content || '(not provided)'}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCompileOutput}
          disabled={state.loading}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {state.loading && <Spinner />}
          Export Pitch Pack
        </button>
        <button
          onClick={() => setState(createInitialState())}
          className="px-6 py-3 border rounded-lg hover:bg-gray-50"
        >
          Start Over
        </button>
      </div>
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
