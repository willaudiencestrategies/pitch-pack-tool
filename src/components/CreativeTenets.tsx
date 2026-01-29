'use client';

import { useState } from 'react';
import { AudienceSegment, Truth } from '@/lib/types';

interface CreativeTenetsProps {
  audience: AudienceSegment;
  insights: Truth[];
  onConfirm: (tenets: string[]) => void;
  onBack: () => void;
  onGenerate: () => Promise<{ intro: string; tenets: string[] }>;
  loading: boolean;
}

export function CreativeTenets({
  audience,
  insights,
  onConfirm,
  onBack,
  onGenerate,
  loading,
}: CreativeTenetsProps) {
  const [generated, setGenerated] = useState(false);
  const [intro, setIntro] = useState('');
  const [tenets, setTenets] = useState<string[]>([]);

  const handleGenerate = async () => {
    try {
      const result = await onGenerate();
      setIntro(result.intro);
      setTenets(result.tenets);
      setGenerated(true);
    } catch {
      // Error handled by parent
    }
  };

  const handleTenetChange = (index: number, value: string) => {
    const newTenets = [...tenets];
    newTenets[index] = value;
    setTenets(newTenets);
  };

  const handleRegenerate = () => {
    setGenerated(false);
    setIntro('');
    setTenets([]);
  };

  const handleConfirm = () => {
    // Filter out empty tenets
    const validTenets = tenets.filter((t) => t.trim().length > 0);
    onConfirm(validTenets);
  };

  // Pre-generation view
  if (!generated) {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
        >
          ← Back
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
            Gate 2: Step 4
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Creative Tenets
          </h2>
          <p className="text-[var(--text-secondary)]">
            Guiding principles for creative execution based on your confirmed work.
          </p>
        </div>

        {/* Foundation Summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Generation Foundation
          </h3>

          {/* Audience Card */}
          <div
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{
                  backgroundColor: 'var(--expedia-navy)',
                  color: 'white',
                }}
              >
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] mb-1">
                  Confirmed Audience
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {audience.name}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                  {audience.needsValues}
                </p>
              </div>
            </div>
          </div>

          {/* Insights Card */}
          <div
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{
                  backgroundColor: 'var(--expedia-navy)',
                  color: 'white',
                }}
              >
                I
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] mb-2">
                  Selected Insights ({insights.length})
                </p>
                <div className="space-y-2">
                  {insights.map((insight, index) => (
                    <div
                      key={insight.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: getLevelColor(insight.level).bg,
                          color: getLevelColor(insight.level).text,
                        }}
                      >
                        {index + 1}
                      </span>
                      <p className="text-[var(--text-secondary)] line-clamp-2">
                        {insight.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Generate CTA */}
        <div
          className="p-6 rounded-xl border-2 border-dashed text-center"
          style={{
            borderColor: 'var(--expedia-navy)',
            backgroundColor: 'rgba(26, 31, 113, 0.03)',
          }}
        >
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              backgroundColor: 'var(--expedia-navy)',
              color: 'white',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Generate based on this work?
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-4 max-w-md mx-auto">
            We'll create guiding principles for creative execution based on your confirmed audience and selected insights.
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <LoadingSpinner />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>Generate Tenets</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>

        {/* Back action */}
        <div className="pt-4 border-t border-[var(--border-color)]">
          <button onClick={onBack} className="btn-outline">
            ← Back to Insights
          </button>
        </div>
      </div>
    );
  }

  // Post-generation view
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
      >
        ← Back
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
          Gate 2: Step 4
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Creative Tenets
        </h2>
        <p className="text-[var(--text-secondary)]">
          Review and refine these guiding principles for creative execution.
        </p>
      </div>

      {/* Generated Intro */}
      {intro && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <p className="text-[var(--text-secondary)] italic leading-relaxed">
            {intro}
          </p>
        </div>
      )}

      {/* Editable Tenet Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Tenets
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            Click to edit
          </span>
        </div>

        {tenets.map((tenet, index) => (
          <div
            key={index}
            className="group relative"
            style={{
              animation: `fadeSlideIn 0.3s ease-out forwards`,
              animationDelay: `${index * 100}ms`,
              opacity: 0,
            }}
          >
            <div
              className="p-4 rounded-xl border-2 transition-all hover:border-[var(--expedia-navy)]/50 hover:shadow-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="flex items-start gap-3">
                {/* Number badge */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--expedia-navy)',
                    color: 'white',
                  }}
                >
                  {index + 1}
                </div>

                {/* Editable content */}
                <div className="flex-1 min-w-0">
                  <textarea
                    value={tenet}
                    onChange={(e) => handleTenetChange(index, e.target.value)}
                    className="w-full bg-transparent border-none resize-none text-[var(--text-primary)] leading-relaxed focus:outline-none focus:ring-0 p-0"
                    style={{ minHeight: '48px' }}
                    rows={2}
                    placeholder="Enter tenet..."
                  />
                </div>

                {/* Edit indicator */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-3">
        <button
          onClick={handleConfirm}
          disabled={tenets.filter((t) => t.trim()).length === 0}
          className="btn-secondary flex items-center gap-2"
        >
          <span>Confirm & Continue</span>
          <span>→</span>
        </button>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="btn-outline flex items-center gap-2"
        >
          {loading ? (
            <>
              <LoadingSpinner />
              <span>Regenerating...</span>
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Regenerate</span>
            </>
          )}
        </button>
        <button onClick={onBack} className="btn-outline">
          ← Back
        </button>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
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

// Helper component for loading spinner
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Helper for insight level colours
function getLevelColor(level: 'safer' | 'sharper' | 'bolder'): { bg: string; text: string } {
  switch (level) {
    case 'bolder':
      return { bg: 'var(--status-red-bg)', text: 'var(--status-red)' };
    case 'sharper':
      return { bg: 'var(--status-amber-bg)', text: 'var(--status-amber)' };
    case 'safer':
    default:
      return { bg: 'var(--status-green-bg)', text: 'var(--status-green)' };
  }
}
