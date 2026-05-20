'use client';

import { useBriefState } from '@/lib/state/BriefStateContext';
import { createInitialState, GATE1_SECTION_KEYS, GATE2_SECTION_KEYS } from '@/lib/types';
import { clearSession } from '@/lib/session-storage';
import { exportToWord } from '@/lib/word-export';
import { BackButton } from '@/components/steps/shared/BackButton';
import { StatusBadge } from '@/components/steps/shared/StatusBadge';
import { LoadingOverlay } from '@/components/steps/shared/LoadingOverlay';

export function OutputStep() {
  const { state, updateState, handlers } = useBriefState();
  const { handleCompileOutput } = handlers;

  // Mark that user has reached output (for forward navigation)
  if (!state.hasReachedOutput) {
    updateState({ hasReachedOutput: true });
  }

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
    const baseName = state.briefFilename
      ? state.briefFilename.replace(/\.[^/.]+$/, '') + ' — Enhanced'
      : 'pitch-pack';
    a.download = `${baseName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // Clear session after successful download
    if (state.briefId) {
      clearSession(state.briefId);
    }
  };

  // Show inline output if we have it
  if (state.outputMarkdown) {
    return (
      <div className="space-y-6" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
        {/* Back Button */}
        <BackButton onClick={() => updateState({ step: 'gate2_media', outputMarkdown: null })} label="Back to Media" />

        {/* Success celebration header */}
        <div className="text-center pb-6 border-b border-[var(--border-color)]">
          {/* Animated success checkmark */}
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              backgroundColor: 'var(--status-green)',
              animation: 'scaleIn 0.4s ease-out',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Your Pitch Pack is Ready!
          </h2>
          <p className="text-[var(--text-secondary)]">
            Review your completed Pitch Pack below. Copy or download when ready.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button onClick={handleCopy} className="btn-secondary flex items-center gap-2 hover:shadow-md transition-shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy to Clipboard
          </button>
          <button onClick={handleDownload} className="btn-outline flex items-center gap-2 hover:shadow-md transition-shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download as Markdown
          </button>
          <button
            onClick={() => exportToWord({
              sections: state.sections,
              audience: state.selectedAudienceSegment || undefined,
              personification: state.personification?.narrative,
              insights: state.selectedInsights,
              brandAlignment: state.brandAlignment || undefined,
              briefFilename: state.briefFilename || undefined,
            })}
            className="btn-outline flex items-center gap-2 hover:shadow-md transition-shadow"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Export as Word
          </button>
        </div>

        {/* Elevated output display card */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Gradient accent bar */}
          <div
            className="h-1"
            style={{
              background: 'linear-gradient(90deg, var(--expedia-navy), var(--expedia-yellow), var(--expedia-navy))',
            }}
          />
          <div className="bg-[var(--bg-primary)] p-6 overflow-auto max-h-[500px]">

        {/* Animation keyframes */}
        <style jsx>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
          <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)] font-mono leading-relaxed">
            {state.outputMarkdown}
          </pre>
          </div>
        </div>

        {/* Start over */}
        <div className="pt-4 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              if (window.confirm('Are you sure? This will clear all your work.')) {
                if (state.briefId) {
                  clearSession(state.briefId);
                }
                updateState(createInitialState());
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
              updateState(createInitialState());
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
