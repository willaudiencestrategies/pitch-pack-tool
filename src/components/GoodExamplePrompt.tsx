'use client';

import { useState, useRef, useEffect } from 'react';
import { GOOD_EXAMPLES } from '@/lib/good-examples';

interface GoodExamplePromptProps {
  sectionKey: string;
}

export function GoodExamplePrompt({ sectionKey }: GoodExamplePromptProps) {
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const example = GOOD_EXAMPLES[sectionKey];

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [example?.content]);

  if (!example) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex items-center gap-2 text-sm transition-colors duration-200"
        style={{
          color: expanded ? 'var(--expedia-navy)' : 'var(--text-muted)',
        }}
        aria-expanded={expanded}
        aria-controls={`example-content-${sectionKey}`}
      >
        {/* Animated chevron */}
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded transition-all duration-200"
          style={{
            backgroundColor: expanded
              ? 'rgba(26, 31, 113, 0.08)'
              : 'transparent',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-colors duration-200"
          >
            <path
              d="M4.5 2.5L8 6L4.5 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        {/* Title with subtle underline on hover */}
        <span className="relative">
          <span className="group-hover:text-[var(--expedia-navy)] transition-colors duration-200">
            {example.title}
          </span>
          <span
            className="absolute bottom-0 left-0 w-full h-px origin-left transition-transform duration-200"
            style={{
              backgroundColor: 'var(--expedia-navy)',
              transform: expanded ? 'scaleX(1)' : 'scaleX(0)',
            }}
          />
        </span>

        {/* Lightbulb icon - subtle hint */}
        <span
          className="transition-opacity duration-200"
          style={{
            opacity: expanded ? 1 : 0.5,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 21h6M12 3a6 6 0 0 0-4 10.5V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.5A6 6 0 0 0 12 3Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* Expandable content with smooth height animation */}
      <div
        id={`example-content-${sectionKey}`}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: expanded ? `${contentHeight + 32}px` : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="pt-3">
          <div
            className="relative p-4 rounded-lg text-sm leading-relaxed"
            style={{
              backgroundColor: 'rgba(255, 199, 44, 0.06)',
              borderLeft: '3px solid var(--expedia-yellow)',
              color: 'var(--text-secondary)',
            }}
          >
            {/* Subtle corner accent */}
            <div
              className="absolute top-0 right-0 w-12 h-12 opacity-5"
              style={{
                background:
                  'radial-gradient(circle at top right, var(--expedia-yellow), transparent 70%)',
              }}
            />
            {example.content}
          </div>
        </div>
      </div>
    </div>
  );
}
