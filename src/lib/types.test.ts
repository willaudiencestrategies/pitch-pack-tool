import { describe, it, expect } from 'vitest';
import { SECTION_KEYS, SECTION_CONFIG, SectionKey } from './types';

describe('Section Configuration', () => {
  it('should include budget as the first section', () => {
    expect(SECTION_KEYS[0]).toBe('budget');
  });

  it('should have 8 sections total', () => {
    expect(SECTION_KEYS.length).toBe(8);
  });

  it('should have budget config with order 0', () => {
    expect(SECTION_CONFIG.budget).toEqual({ name: 'Budget', order: 0 });
  });
});
