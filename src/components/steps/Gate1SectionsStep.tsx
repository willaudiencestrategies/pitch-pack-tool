'use client';

import { useState } from 'react';
import { useBriefState } from '@/lib/state/BriefStateContext';
import {
  Section,
  SECTION_CONFIG,
  SECTION_KEYS,
  GATE1_SECTION_KEYS,
  BudgetDetails,
} from '@/lib/types';
import { GoodExamplePrompt } from '@/components/GoodExamplePrompt';
import { ProductionBudget } from '@/components/ProductionBudget';
import { BackButton } from '@/components/steps/shared/BackButton';
import { StatusBadge } from '@/components/steps/shared/StatusBadge';
import { Spinner } from '@/components/steps/shared/Spinner';

const CREATIVE_TASK_TEMPLATE = `Put forward 1-3 concepts that respond to [OBJECTIVES], including:
- Creative overview
- Insight used
- Example executions across key channels
- Campaign creative tenets`;

function extractBudgetFromContent(content: string): string | undefined {
  // Look for currency patterns like $500,000 or £50K
  const match = content.match(/[\$£€][\d,]+[KkMm]?/);
  return match ? match[0] : undefined;
}

function PerSectionPrompts({
  sectionName,
  prompts,
}: {
  sectionName: string;
  prompts: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = async (prompt: string, index: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API failed silently
    }
  };

  return (
    <div className="px-4 pb-3">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--expedia-navy)] transition-colors py-1"
      >
        <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>
        Stuck? Try these prompts in ChatGPT or Claude ({prompts.length})
      </button>

      {isOpen && (
        <div
          className="mt-2 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3"
          style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-[var(--text-muted)]">
            <strong>Tip:</strong> Copy these into ChatGPT, Claude, or your preferred AI assistant to research gaps in your {sectionName.toLowerCase()} section. Then paste any useful findings into the "Tell me more" box below.
          </p>

          {prompts.map((prompt, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]">
              <p className="flex-1 text-sm text-[var(--text-secondary)] leading-relaxed">{prompt}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(prompt, idx);
                }}
                className="flex-shrink-0 text-xs text-[var(--expedia-navy)] hover:underline whitespace-nowrap"
              >
                {copied === idx ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}
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
  budgetDetails,
  onBudgetConfirm,
  suggestedPrompts,
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
  budgetDetails?: BudgetDetails | null;
  onBudgetConfirm?: (budget: BudgetDetails) => void;
  suggestedPrompts?: string[];
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
    <div
      className="space-y-6"
      style={{
        animation: 'fadeSlideIn 0.4s ease-out',
      }}
    >
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
            them in your final Brief Pack.
          </p>
        </div>
      )}

      {/* Budget section - Production Budget component */}
      {section.key === 'budget' && onBudgetConfirm && (
        <div className="mt-6 p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <ProductionBudget
            extractedBudget={extractBudgetFromContent(section.content)}
            onConfirm={onBudgetConfirm}
            onBack={onBack}
            initialValue={budgetDetails}
          />
        </div>
      )}

      {/* Creative Task template */}
      {section.key === 'creative_task' && (
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <p className="text-sm font-medium text-[var(--text-muted)] mb-2">Suggested creative task:</p>
          <textarea
            aria-label="Creative task template"
            className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--expedia-navy)]/20 focus:border-[var(--expedia-navy)]"
            rows={6}
            value={section.content || CREATIVE_TASK_TEMPLATE}
            onChange={(e) => onUpdateContent(e.target.value)}
          />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Edit as needed. This is a starting point, not a constraint.
          </p>
        </div>
      )}

      {/* Current Content - hidden for creative_task since template is shown above */}
      <div className="space-y-3">
        {section.key !== 'creative_task' && (
          <>
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
          </>
        )}
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
                Answer the questions above in the text box below, then click "Re-assess with Info"
              </p>
            )}

            {/* Per-section research prompts - below AI Analysis */}
            {suggestedPrompts && suggestedPrompts.length > 0 && section.status !== 'green' && (
              <div className="mt-4 pt-4 border-t border-current/10">
                <PerSectionPrompts
                  sectionName={section.name}
                  prompts={suggestedPrompts}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Suggestion - yellow accent border like GoodExamplePrompt */}
      {section.suggestion && (
        <div
          className="relative space-y-4 p-5 rounded-xl"
          style={{
            borderLeft: '3px solid var(--expedia-yellow)',
            backgroundColor: 'rgba(255, 199, 44, 0.06)',
          }}
        >
          {/* Subtle corner accent */}
          <div
            className="absolute top-0 right-0 w-16 h-16 opacity-5 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at top right, var(--expedia-yellow), transparent 70%)',
            }}
          />
          <label className="block text-sm font-semibold text-[var(--text-primary)]">
            AI Suggestion
          </label>
          <textarea
            aria-label={`AI suggestion for ${section.name}`}
            className="textarea-field"
            style={{ minHeight: '180px', backgroundColor: 'var(--bg-primary)' }}
            value={section.suggestion}
            onChange={(e) => onUpdateSuggestion(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={onAcceptSuggestion}
              className="btn-secondary text-sm px-5 py-2.5 hover:shadow-sm transition-shadow"
            >
              Use this suggestion
            </button>
            <button
              onClick={() => onUpdateSuggestion('')}
              className="btn-outline text-sm px-5 py-2.5 hover:shadow-sm transition-shadow"
            >
              Keep current
            </button>
          </div>
        </div>
      )}

      {/* AI Tools - available for ALL sections including green */}
      <div className="space-y-4 p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
        <label className="block text-sm font-semibold text-[var(--text-primary)]">
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
          className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 hover:shadow-sm transition-shadow"
        >
          {loading && <Spinner className="text-white" />}
          Re-assess with Info
        </button>
        {reassessSuccess && (
          <p className="text-sm text-[var(--status-green)] flex items-center gap-1">
            <span>✓</span> Re-assessment complete - check the suggestion above
          </p>
        )}
      </div>

      {/* Continue Button — hidden on the budget section, where ProductionBudget's
          own Confirm Budget is the only advance path. A second generic button here
          skipped the budget capture, silently dropping typed figures. */}
      {section.key !== 'budget' && (
        <div className="pt-4 border-t border-[var(--border-color)]">
          <button
            onClick={onNext}
            className="btn-secondary flex items-center gap-2 hover:shadow-sm transition-shadow"
          >
            {sectionIndex < totalSections - 1 ? 'Confirm & Continue' : 'Finish Sections'}
            <span>→</span>
          </button>
        </div>
      )}

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export function Gate1SectionsStep() {
  const { state, updateState, handlers, pushHistory } = useBriefState();
  const {
    handleSectionReassess,
    handleBudgetConfirm,
    goToNextGate1Section,
    goToPreviousGate1Section,
  } = handlers;

  // Local helpers (not in handlers bag)
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
      // Push current state to history before accepting suggestion
      pushHistory(`Use suggestion for ${section.name}`, { sections: [...state.sections] });

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

  // Get only Gate 1 sections
  const gate1Sections = state.sections.filter((s) =>
    GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
  );
  const section = gate1Sections[state.currentSectionIndex];

  if (!section) {
    // Safety check - should not happen
    return null;
  }

  // Get suggested prompts from triage result for this section
  const triageSection = state.triageResult?.triageAssessment.find((s) => s.key === section.key);
  const sectionPrompts = triageSection?.suggestedPrompts;

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
      budgetDetails={state.budgetDetails}
      onBudgetConfirm={handleBudgetConfirm}
      suggestedPrompts={sectionPrompts}
    />
  );
}
