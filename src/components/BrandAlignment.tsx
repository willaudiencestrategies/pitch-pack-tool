'use client';

import { useState, useEffect } from 'react';
import { BrandAlignment as BrandAlignmentType, ExpediaBrand, BrandFitResponse } from '@/lib/types';
import { BRAND_CRITERIA, BrandCriteria } from '@/lib/brand-criteria';
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

  const handleConfirm = () => {
    if (!selectedBrand) return;
    onConfirm({
      brand: selectedBrand,
      hasDGMatch,
      brandAudience: BRAND_CRITERIA[selectedBrand].targetAudience.name,
    });
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
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Brand Alignment
        </h2>
        <p className="text-[var(--text-secondary)]">
          Select which Expedia Group brand this campaign is for.
        </p>
      </div>

      {/* Brand Selection Cards */}
      <div className="space-y-3">
        {BRANDS.map((brandKey) => {
          const brand = BRAND_CRITERIA[brandKey];
          const isSelected = selectedBrand === brandKey;

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
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
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
                  <p className="text-[var(--text-secondary)] mb-3">{brand.tagline}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                      Core Audience
                    </span>
                    <span className="text-sm text-[var(--text-primary)]">{brand.targetAudience.name}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
              Check this if the campaign includes destination group matching or co-investment funding.
            </p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={!selectedBrand}
          className="btn-secondary flex items-center gap-2"
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
