import { describe, it, expect } from 'vitest';
import { BRAND_CRITERIA, getBrandContextForPrompt } from '../brand-criteria';

describe('BRAND_CRITERIA', () => {
  it('should have all three brands defined', () => {
    expect(BRAND_CRITERIA.expedia).toBeDefined();
    expect(BRAND_CRITERIA.hotels_com).toBeDefined();
    expect(BRAND_CRITERIA.vrbo).toBeDefined();
  });

  it('should have required fields for each brand', () => {
    const brands = Object.values(BRAND_CRITERIA);
    brands.forEach((brand) => {
      expect(brand.name).toBeTruthy();
      expect(brand.tagline).toBeTruthy();
      expect(brand.targetAudience.name).toBeTruthy();
      expect(brand.targetAudience.description).toBeTruthy();
      expect(brand.targetAudience.avgAge).toBeGreaterThan(0);
      expect(brand.targetAudience.keyValues.length).toBeGreaterThan(0);
      expect(brand.brandPillars.length).toBeGreaterThan(0);
    });
  });
});

describe('getBrandContextForPrompt', () => {
  it('should return formatted context for Expedia', () => {
    const context = getBrandContextForPrompt('expedia');
    expect(context).toContain('Expedia');
    expect(context).toContain('Quality Seekers');
    expect(context).toContain('Control');
  });

  it('should return formatted context for Hotels.com', () => {
    const context = getBrandContextForPrompt('hotels_com');
    expect(context).toContain('Hotels.com');
    expect(context).toContain('Savvy Trip Takers');
  });

  it('should return formatted context for Vrbo', () => {
    const context = getBrandContextForPrompt('vrbo');
    expect(context).toContain('Vrbo');
    expect(context).toContain('Group Planners');
  });
});
