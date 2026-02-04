'use client';

import { useState, useEffect } from 'react';
import { BrandAlignment as BrandAlignmentType, ExpediaBrand, BrandFitResponse } from '@/lib/types';
import { BRAND_CRITERIA } from '@/lib/brand-criteria';
import { BRAND_FIT_STAGES } from '@/lib/loading-config';
import { useLoadingProgress } from '@/hooks/useLoadingProgress';
import { LoadingProgress } from './LoadingProgress';

const BRANDS: ExpediaBrand[] = ['expedia', 'hotels_com', 'vrbo'];

interface BrandAlignmentProps {
  onConfirm: (alignment: BrandAlignmentType) => void;
  onBack: () => void;
  initialValue?: BrandAlignmentType | null;
  briefAudienceContent?: string;
  briefObjectiveContent?: string;
}

export function BrandAlignment({
  onConfirm,
  onBack,
  initialValue,
  briefAudienceContent,
  briefObjectiveContent,
}: BrandAlignmentProps) {
  const [selectedBrand, setSelectedBrand] = useState<ExpediaBrand | null>(
    initialValue?.brand ?? null
  );
  const [hasDGMatch, setHasDGMatch] = useState(initialValue?.hasDGMatch ?? false);
  const [fitResult, setFitResult] = useState<BrandFitResponse | null>(null);
  const [fitAcknowledged, setFitAcknowledged] = useState(false);
  const [isCheckingFit, setIsCheckingFit] = useState(false);

  const fitProgress = useLoadingProgress(BRAND_FIT_STAGES);

  // Check brand fit when selection changes
  useEffect(() => {
    if (selectedBrand && briefAudienceContent) {
      checkBrandFit(selectedBrand);
    } else {
      setFitResult(null);
      setFitAcknowledged(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand]);

  const checkBrandFit = async (brand: ExpediaBrand) => {
    setIsCheckingFit(true);
    setFitResult(null);
    setFitAcknowledged(false);
    fitProgress.runSimulatedProgress();

    try {
      const response = await fetch('/api/brand-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          briefAudienceContent: briefAudienceContent || '',
          briefObjectiveContent: briefObjectiveContent || '',
        }),
      });

      if (!response.ok) throw new Error('Fit check failed');

      const result: BrandFitResponse = await response.json();
      setFitResult(result);
      fitProgress.complete();

      // Auto-acknowledge if strong fit
      if (result.fitLevel === 'strong') {
        setFitAcknowledged(true);
      }
    } catch (error) {
      console.error('Brand fit check error:', error);
      fitProgress.reset();
      // Allow proceeding even if check fails
      setFitAcknowledged(true);
    } finally {
      setIsCheckingFit(false);
    }
  };

  const canProceed = selectedBrand && (fitAcknowledged || !fitResult);

  const handleConfirm = () => {
    if (!selectedBrand || !canProceed) return;
    onConfirm({
      brand: selectedBrand,
      hasDGMatch,
      brandAudience: BRAND_CRITERIA[selectedBrand].targetAudience.name,
    });
  };

  const renderBrandCard = (brandKey: ExpediaBrand) => {
    const brand = BRAND_CRITERIA[brandKey];
    const isSelected = selectedBrand === brandKey;
    const ta = brand.targetAudience;

    return (
      <div
        key={brandKey}
        onClick={() => setSelectedBrand(brandKey)}
        className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
          isSelected
            ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5 shadow-md'
            : 'border-[var(--border-color)] hover:border-[var(--expedia-navy)]/50 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Radio indicator */}
          <div className="pt-0.5">
            <div
              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]'
                  : 'border-[var(--border-color)]'
              }`}
            >
              {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3
              className={`font-semibold text-lg mb-1 ${
                isSelected ? 'text-[var(--expedia-navy)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {brand.name}
            </h3>
            <p className="text-sm text-[var(--text-muted)] italic mb-3">{`"${brand.tagline}"`}</p>

            {/* Target Audience */}
            <div className="mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--expedia-navy)]">
                Target: {ta.name}
              </span>
              <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                {ta.description}
              </p>
            </div>

            {/* Stats Pills */}
            <div className="flex gap-2 mb-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                Age {ta.avgAge} avg
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                {ta.percentOfTravelers}% travelers
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                {ta.percentOfSpend}% spend
              </span>
            </div>

            {/* Key Values */}
            <div className="flex flex-wrap gap-1.5">
              {ta.keyValues.slice(0, 4).map((value) => (
                <span
                  key={value}
                  className="text-xs px-2 py-0.5 rounded bg-[var(--expedia-navy)]/10 text-[var(--expedia-navy)]"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFitResult = () => {
    if (isCheckingFit && fitProgress.isActive) {
      return (
        <div className="mt-4 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <LoadingProgress
            stages={BRAND_FIT_STAGES}
            currentStageIndex={fitProgress.currentStageIndex}
            showTips={false}
            confirmationMessage="Brand selected"
          />
        </div>
      );
    }

    if (!fitResult) return null;

    const fitStyles = {
      strong: {
        border: 'border-green-500',
        bg: 'bg-green-50',
        icon: '✓',
        iconBg: 'bg-green-500',
        title: 'Strong Alignment',
      },
      moderate: {
        border: 'border-amber-500',
        bg: 'bg-amber-50',
        icon: '!',
        iconBg: 'bg-amber-500',
        title: 'Moderate Alignment',
      },
      weak: {
        border: 'border-red-500',
        bg: 'bg-red-50',
        icon: '✗',
        iconBg: 'bg-red-500',
        title: 'Weak Alignment',
      },
    };

    const style = fitStyles[fitResult.fitLevel];

    return (
      <div className={`mt-4 p-4 rounded-lg border-2 ${style.border} ${style.bg}`}>
        <div className="flex items-start gap-3">
          <div
            className={`h-6 w-6 rounded-full ${style.iconBg} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}
          >
            {style.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-[var(--text-primary)]">{style.title}</h4>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{fitResult.reasoning}</p>

            {fitResult.suggestion && (
              <p className="text-sm text-[var(--text-muted)] mt-2 italic">{fitResult.suggestion}</p>
            )}

            {fitResult.alternativeBrand && (
              <p className="text-sm mt-2">
                <span className="text-[var(--text-muted)]">Consider: </span>
                <button
                  onClick={() => setSelectedBrand(fitResult.alternativeBrand!)}
                  className="text-[var(--expedia-navy)] font-medium hover:underline"
                >
                  {BRAND_CRITERIA[fitResult.alternativeBrand].name}
                </button>
              </p>
            )}

            {fitResult.fitLevel !== 'strong' && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fitAcknowledged}
                  onChange={(e) => setFitAcknowledged(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-color)] accent-[var(--expedia-navy)]"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  {`I've considered this and want to proceed`}
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4"
      >
        ← Back
      </button>

      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Brand Alignment</h2>
        <p className="text-[var(--text-secondary)]">
          Select which Expedia Group brand this campaign is for.
        </p>
      </div>

      {/* Brand Selection Cards */}
      <div className="space-y-3">{BRANDS.map(renderBrandCard)}</div>

      {/* Fit Assessment Result */}
      {selectedBrand && renderFitResult()}

      {/* DG Match Checkbox */}
      <div className="pt-4 border-t border-[var(--border-color)]">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="pt-0.5">
            <input
              type="checkbox"
              checked={hasDGMatch}
              onChange={(e) => setHasDGMatch(e.target.checked)}
              className="h-5 w-5 rounded border-[var(--border-color)] accent-[var(--expedia-navy)] cursor-pointer"
            />
          </div>
          <div>
            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--expedia-navy)] transition-colors">
              DG Match / Co-investment
            </span>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Check this if the campaign includes destination group matching or co-investment
              funding.
            </p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={!canProceed || isCheckingFit}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <span>→</span>
        </button>
        <button onClick={onBack} className="btn-outline">
          ← Back
        </button>
      </div>
    </div>
  );
}
