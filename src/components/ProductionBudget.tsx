'use client';

import { useState, useEffect } from 'react';
import { BudgetDetails } from '@/lib/types';

type Currency = 'USD' | 'GBP' | 'EUR' | 'AUD';

interface ProductionBudgetProps {
  onConfirm: (details: BudgetDetails) => void;
  onSkip?: () => void;
  onBack: () => void;
  initialValue?: BudgetDetails | null;
  extractedBudget?: string;
}

const CURRENCY_CONFIG: Record<Currency, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'US Dollar' },
  GBP: { symbol: '\u00A3', name: 'British Pound' },
  EUR: { symbol: '\u20AC', name: 'Euro' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
};

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'AUD'];

export function ProductionBudget({
  onConfirm,
  onSkip,
  onBack,
  initialValue,
  extractedBudget,
}: ProductionBudgetProps) {
  const [currency, setCurrency] = useState<Currency>(
    (initialValue?.currency as Currency) || 'USD'
  );
  const [totalBudget, setTotalBudget] = useState(
    initialValue?.totalBudget || extractedBudget || ''
  );
  const [productionBudget, setProductionBudget] = useState(
    initialValue?.productionBudget || ''
  );
  const [showHelp, setShowHelp] = useState(false);

  // Pre-fill total budget if extracted
  useEffect(() => {
    if (extractedBudget && !totalBudget) {
      setTotalBudget(extractedBudget);
    }
  }, [extractedBudget, totalBudget]);

  const handleConfirm = () => {
    if (!productionBudget.trim()) return;
    onConfirm({
      totalBudget: totalBudget.trim(),
      productionBudget: productionBudget.trim(),
      currency,
    });
  };

  const parseBudgetValue = (value: string): number => {
    // Handle K (thousands) and M (millions) suffixes
    const upperValue = value.toUpperCase().trim();
    const cleanedValue = upperValue.replace(/[^0-9.KM]/g, '');

    let multiplier = 1;
    let numericPart = cleanedValue;

    if (cleanedValue.endsWith('K')) {
      multiplier = 1000;
      numericPart = cleanedValue.slice(0, -1);
    } else if (cleanedValue.endsWith('M')) {
      multiplier = 1000000;
      numericPart = cleanedValue.slice(0, -1);
    }

    const baseValue = parseFloat(numericPart.replace(/[^0-9.]/g, ''));
    return isNaN(baseValue) ? 0 : baseValue * multiplier;
  };

  const calculateSuggested10Percent = () => {
    const numericValue = parseBudgetValue(totalBudget);
    if (numericValue > 0) {
      const suggested = Math.round(numericValue * 0.1);
      setProductionBudget(suggested.toLocaleString());
    }
  };

  const formatInputValue = (value: string) => {
    // Allow only numbers, commas, and decimal points
    return value.replace(/[^0-9,.\s]/g, '');
  };

  const canConfirm = productionBudget.trim().length > 0;
  const hasTotalBudget = totalBudget.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4 transition-colors"
      >
        <span>&larr;</span> Back
      </button>

      {/* Header */}
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Production Budget
        </h2>
        <p className="text-[var(--text-secondary)]">
          Set the production budget for this campaign.
        </p>
      </div>

      {/* Currency Selector */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Currency
        </label>
        <div className="flex gap-2">
          {CURRENCIES.map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                currency === curr
                  ? 'bg-[var(--expedia-navy)] text-white shadow-md'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] border border-[var(--border-color)]'
              }`}
            >
              <span className="block font-semibold">{curr}</span>
              <span className="block text-xs opacity-75">
                {CURRENCY_CONFIG[curr].symbol}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Total Campaign Budget */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Total Campaign Budget
          <span className="text-[var(--text-muted)] font-normal ml-1">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-medium">
            {CURRENCY_CONFIG[currency].symbol}
          </span>
          <input
            type="text"
            value={totalBudget}
            onChange={(e) => setTotalBudget(formatInputValue(e.target.value))}
            placeholder="500,000"
            className="input-field pl-10"
          />
        </div>
        {extractedBudget && totalBudget === extractedBudget && (
          <p className="text-xs text-[var(--status-green)] flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Pre-filled from brief
          </p>
        )}
      </div>

      {/* Production Budget (Mandatory) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Production Budget
            <span className="text-[var(--status-red)] ml-0.5">*</span>
          </label>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-[var(--expedia-navy)] hover:underline flex items-center gap-1 transition-colors"
          >
            {showHelp ? 'Hide' : "What's this?"}
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Help Text */}
        {showHelp && (
          <div
            className="p-4 rounded-xl bg-[var(--expedia-navy)]/5 border border-[var(--expedia-navy)]/20 text-sm text-[var(--text-secondary)]"
            style={{
              animation: 'fadeSlideIn 0.2s ease-out forwards',
            }}
          >
            <p className="font-medium text-[var(--text-primary)] mb-2">
              What is Production Budget?
            </p>
            <p>
              The production budget is the portion of the total campaign budget allocated
              specifically for creating the creative assets (video, photography, design, etc.).
            </p>
            <p className="mt-2">
              <strong>Rule of thumb:</strong> Production is typically around{' '}
              <span className="font-semibold text-[var(--expedia-navy)]">10%</span> of the total
              campaign budget.
            </p>
          </div>
        )}

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-medium">
            {CURRENCY_CONFIG[currency].symbol}
          </span>
          <input
            type="text"
            value={productionBudget}
            onChange={(e) => setProductionBudget(formatInputValue(e.target.value))}
            placeholder="50,000"
            className={`input-field pl-10 ${
              !canConfirm
                ? 'border-[var(--status-red)]/30 focus:border-[var(--status-red)] focus:ring-[var(--status-red)]/20'
                : ''
            }`}
          />
        </div>

        {/* Suggested 10% Calculation */}
        {hasTotalBudget && (
          <button
            onClick={calculateSuggested10Percent}
            className="text-sm text-[var(--expedia-navy)] hover:text-[var(--expedia-navy-dark)] flex items-center gap-2 transition-colors group"
          >
            <svg
              className="w-4 h-4 group-hover:rotate-45 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            Calculate suggested 10% ({CURRENCY_CONFIG[currency].symbol}
            {(() => {
              const numericValue = parseBudgetValue(totalBudget);
              if (numericValue > 0) {
                return Math.round(numericValue * 0.1).toLocaleString();
              }
              return '...';
            })()}
            )
          </button>
        )}

        {!canConfirm && (
          <p className="text-xs text-[var(--status-red)]">
            Production budget is required to continue
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="pt-6 border-t border-[var(--border-color)] space-y-3">
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <span>Confirm Budget</span>
          <span>&rarr;</span>
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-2"
          >
            Skip for now
          </button>
        )}
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
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
