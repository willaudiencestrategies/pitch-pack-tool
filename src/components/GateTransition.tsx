'use client';

import { Section, GATE1_SECTION_KEYS, SECTION_CONFIG, Status } from '@/lib/types';

interface GateTransitionProps {
  sections: Section[];
  onContinue: () => void;
  onBack: () => void;
}

// Gate 2 step preview data
const GATE2_STEPS = [
  {
    key: 'brand_alignment',
    name: 'Brand Alignment',
    description: 'Confirm the Expedia Group brand and co-investment status',
  },
  {
    key: 'audience_deep_dive',
    name: 'Audience Deep-Dive',
    description: 'Explore and personify your target audience segments',
  },
  {
    key: 'audience_insights',
    name: 'Audience Insights',
    description: 'Select up to 3 psychological truths that drive creative',
  },
  {
    key: 'creative_tenets',
    name: 'Creative Tenets',
    description: 'Generate guiding principles for creative execution',
  },
  {
    key: 'media_context',
    name: 'Media Context',
    description: 'Define channels, timing, and market considerations',
  },
];

function StatusIndicator({ status }: { status: Status }) {
  const config = {
    green: {
      bg: 'var(--status-green-bg)',
      color: 'var(--status-green)',
      icon: '✓',
      label: 'Ready',
    },
    amber: {
      bg: 'var(--status-amber-bg)',
      color: 'var(--status-amber)',
      icon: '!',
      label: 'Workable',
    },
    red: {
      bg: 'var(--status-red-bg)',
      color: 'var(--status-red)',
      icon: '✗',
      label: 'Flagged',
    },
  };

  const { bg, color, icon, label } = config[status];

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
      style={{ backgroundColor: bg, color }}
    >
      <span className="text-xs">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export function GateTransition({ sections, onContinue, onBack }: GateTransitionProps) {
  // Filter to only Gate 1 sections
  const gate1Sections = sections.filter((s) =>
    GATE1_SECTION_KEYS.includes(s.key as typeof GATE1_SECTION_KEYS[number])
  );

  // Count by status
  const statusCounts = {
    green: gate1Sections.filter((s) => s.status === 'green').length,
    amber: gate1Sections.filter((s) => s.status === 'amber').length,
    red: gate1Sections.filter((s) => s.status === 'red').length,
  };

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
      >
        ← Back to sections
      </button>

      {/* Gate 1 Complete Header */}
      <div className="text-center">
        {/* Completion badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{
            background: 'linear-gradient(135deg, var(--status-green-bg) 0%, rgba(10, 124, 66, 0.15) 100%)',
            border: '1px solid var(--status-green)',
          }}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{
              backgroundColor: 'var(--status-green)',
              animation: 'checkPulse 2s ease-in-out infinite',
            }}
          >
            ✓
          </span>
          <span className="font-semibold text-[var(--status-green)]">Gate 1 Complete</span>
        </div>

        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Brief Assessment Complete
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          You've reviewed all core brief elements. Now let's build the creative brief components.
        </p>
      </div>

      {/* Gate 1 Summary Grid */}
      <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-primary)]">
        <div
          className="px-4 py-3 border-b border-[var(--border-color)]"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <h3 className="font-medium text-[var(--text-primary)] text-sm">
            Gate 1: Brief Assessment Summary
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: 'var(--border-color)' }}>
          {gate1Sections.map((section) => (
            <div
              key={section.key}
              className="p-4 flex items-center justify-between"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {SECTION_CONFIG[section.key].order + 1}
                </span>
                <span className="font-medium text-[var(--text-primary)]">{section.name}</span>
              </div>
              <StatusIndicator status={section.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Status Count Summary */}
      <div className="flex items-center justify-center gap-4 text-sm">
        {statusCounts.green > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: 'var(--status-green)' }}
            />
            <span className="text-[var(--text-secondary)]">
              <strong className="text-[var(--status-green)]">{statusCounts.green}</strong> ready
            </span>
          </span>
        )}
        {statusCounts.amber > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: 'var(--status-amber)' }}
            />
            <span className="text-[var(--text-secondary)]">
              <strong className="text-[var(--status-amber)]">{statusCounts.amber}</strong> workable
            </span>
          </span>
        )}
        {statusCounts.red > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: 'var(--status-red)' }}
            />
            <span className="text-[var(--text-secondary)]">
              <strong className="text-[var(--status-red)]">{statusCounts.red}</strong> flagged
            </span>
          </span>
        )}
      </div>

      {/* Divider with "Next" label */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
        <span
          className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider"
          style={{
            backgroundColor: 'var(--expedia-navy)',
            color: 'white',
          }}
        >
          Coming Up
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
      </div>

      {/* Gate 2 Preview */}
      <div className="space-y-4">
        <h3 className="font-medium text-[var(--text-primary)] text-sm text-center">
          Gate 2: Build Creative Brief
        </h3>

        <div className="space-y-2">
          {GATE2_STEPS.map((step, index) => (
            <div
              key={step.key}
              className="flex items-center gap-4 p-3 rounded-xl transition-all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                opacity: 0.85,
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Step number */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                style={{
                  backgroundColor: 'var(--expedia-navy)',
                  color: 'white',
                  opacity: 0.7,
                }}
              >
                {index + 1}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] text-sm">{step.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{step.description}</p>
              </div>

              {/* Arrow indicator */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                }}
              >
                <span className="text-xs">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={onContinue} className="btn-secondary flex items-center gap-2 flex-1 justify-center">
          <span>Continue to Gate 2</span>
          <span>→</span>
        </button>
        <button onClick={onBack} className="btn-outline">
          ← Back
        </button>
      </div>

      {/* Subtle animation keyframes */}
      <style jsx>{`
        @keyframes checkPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(10, 124, 66, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 8px rgba(10, 124, 66, 0);
          }
        }
      `}</style>
    </div>
  );
}
