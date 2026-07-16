import { describe, it, expect } from 'vitest';
import { ensureTenetsProvenance } from '../output-postprocess';

const MD = `# PITCH PACK: Nashville

## TARGET AUDIENCE

**Primary: The Reassemblers**

## CREATIVE TENETS

**1. The Trip Is The Proof**
- dot one

## MEDIA CONTEXT

Channels here.`;

describe('ensureTenetsProvenance', () => {
  it('injects the statement under the CREATIVE TENETS heading when missing', () => {
    const out = ensureTenetsProvenance(MD, 'The Reassemblers', true);
    const idx = out.indexOf('## CREATIVE TENETS');
    const injected = out.indexOf('built solely from the primary audience — The Reassemblers');
    expect(injected).toBeGreaterThan(idx);
    expect(injected).toBeLessThan(out.indexOf('**1. The Trip Is The Proof**'));
    // Later sections untouched
    expect(out).toContain('## MEDIA CONTEXT');
  });

  it('does not duplicate when the compiler already stated it', () => {
    const already = MD.replace(
      '## CREATIVE TENETS\n',
      '## CREATIVE TENETS\n\n*These tenets are built solely from the primary audience — The Reassemblers.*\n'
    );
    const out = ensureTenetsProvenance(already, 'The Reassemblers', true);
    expect(out).toBe(already);
  });

  it('is a no-op with no secondary audiences', () => {
    expect(ensureTenetsProvenance(MD, 'The Reassemblers', false)).toBe(MD);
  });

  it('is a no-op when the heading is absent', () => {
    const noHeading = '# PITCH PACK\n\nNo tenets section.';
    expect(ensureTenetsProvenance(noHeading, 'X', true)).toBe(noHeading);
  });

  it('matches heading case-insensitively and at any depth', () => {
    const md = '### Creative Tenets\n\n- something';
    const out = ensureTenetsProvenance(md, 'Primaries', true);
    expect(out).toContain('built solely from the primary audience — Primaries');
  });

  it('only checks the tenets section body for an existing statement', () => {
    // "primary audience" appearing in a LATER section must not suppress injection
    const md = '## CREATIVE TENETS\n\n- a tenet\n\n## NOTES\n\nprimary audience mentioned here';
    const out = ensureTenetsProvenance(md, 'X', true);
    expect(out).toContain('built solely from the primary audience — X');
  });
});
