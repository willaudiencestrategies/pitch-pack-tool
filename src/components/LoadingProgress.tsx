'use client';

import { useState, useEffect } from 'react';
import { StageConfig, getRandomTip } from '@/lib/loading-config';

interface LoadingProgressProps {
  stages: StageConfig[];
  currentStageIndex: number;
  showTips?: boolean;
}

export function LoadingProgress({ stages, currentStageIndex, showTips = true }: LoadingProgressProps) {
  const [tip, setTip] = useState(() => getRandomTip());
  const [tipKey, setTipKey] = useState(0);

  // Rotate tips every 5 seconds
  useEffect(() => {
    if (!showTips) return;

    const interval = setInterval(() => {
      setTip(getRandomTip());
      setTipKey((k) => k + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [showTips]);

  const currentStage = stages[currentStageIndex] || stages[0];
  const percent = currentStage?.percent || 0;

  return (
    <div className="loading-container">
      {/* Brief uploaded confirmation */}
      {currentStageIndex > 0 && (
        <div className="upload-confirmation">
          <div className="check-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2.5 7.5L5.5 10.5L11.5 3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span>Brief uploaded</span>
        </div>
      )}

      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-header">
          <span className="progress-label">{currentStage?.message || 'Processing...'}</span>
          <span className="progress-percent">{percent}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
          <div className="progress-glow" style={{ left: `${Math.max(0, percent - 2)}%` }} />
        </div>
      </div>

      {/* Current action text */}
      <div className="action-text">
        <h3 className="action-message">{currentStage?.message}</h3>
        {currentStage?.subMessage && (
          <p className="action-sub">{currentStage.subMessage}</p>
        )}
      </div>

      {/* Animated dots */}
      <div className="dots-container">
        <span className="dot dot-1" />
        <span className="dot dot-2" />
        <span className="dot dot-3" />
      </div>

      {/* Tips section */}
      {showTips && (
        <div className="tips-section" key={tipKey}>
          <div className="tip-icon">{tip.icon}</div>
          <p className="tip-text">{tip.tip}</p>
        </div>
      )}

      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 2rem;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Upload confirmation */
        .upload-confirmation {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          background: var(--status-green-bg);
          color: var(--status-green);
          font-size: 0.875rem;
          font-weight: 500;
          animation: fadeIn 0.3s ease-out;
        }

        .check-icon {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 50%;
          background: var(--status-green);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Progress bar */
        .progress-container {
          width: 100%;
          max-width: 28rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .progress-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .progress-percent {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--expedia-navy);
          font-variant-numeric: tabular-nums;
        }

        .progress-track {
          position: relative;
          height: 0.5rem;
          background: var(--bg-tertiary);
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: 9999px;
          background: linear-gradient(90deg, var(--expedia-navy) 0%, var(--expedia-yellow) 100%);
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-glow {
          position: absolute;
          top: 0;
          width: 2rem;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 199, 44, 0.6) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s ease-in-out infinite;
          transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes shimmer {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.8;
          }
        }

        /* Action text */
        .action-text {
          text-align: center;
        }

        .action-message {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
        }

        .action-sub {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* Animated dots */
        .dots-container {
          display: flex;
          gap: 0.375rem;
          padding: 0.5rem;
        }

        .dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: var(--expedia-navy);
        }

        .dot-1 {
          animation: dotPulse 1.4s ease-in-out infinite;
          animation-delay: 0s;
        }

        .dot-2 {
          animation: dotPulse 1.4s ease-in-out infinite;
          animation-delay: 0.2s;
        }

        .dot-3 {
          animation: dotPulse 1.4s ease-in-out infinite;
          animation-delay: 0.4s;
        }

        @keyframes dotPulse {
          0%,
          80%,
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
          40% {
            transform: scale(1.3);
            opacity: 1;
          }
        }

        /* Tips section */
        .tips-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          max-width: 28rem;
          animation: fadeIn 0.4s ease-out;
        }

        .tip-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .tip-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
