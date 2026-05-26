import { describe, it, expect } from 'vitest';
import { extractBalancedJson } from '../claude-json-extract';

describe('extractBalancedJson', () => {
  it('returns plain JSON object verbatim', () => {
    const input = '{"key":"value"}';
    expect(extractBalancedJson(input)).toBe('{"key":"value"}');
  });

  it('returns plain JSON array verbatim', () => {
    const input = '[1,2,3]';
    expect(extractBalancedJson(input)).toBe('[1,2,3]');
  });

  it('strips leading prose before the JSON', () => {
    const input = 'Here is the result:\n\n{"key":"value"}';
    expect(extractBalancedJson(input)).toBe('{"key":"value"}');
  });

  it('strips trailing prose after the JSON', () => {
    const input = '{"key":"value"}\n\nLet me know if you need adjustments.';
    expect(extractBalancedJson(input)).toBe('{"key":"value"}');
  });

  it('strips both leading and trailing prose', () => {
    const input = 'Here you go:\n{"a":1,"b":2}\nDone.';
    expect(extractBalancedJson(input)).toBe('{"a":1,"b":2}');
  });

  it('handles markdown code fence wrapping', () => {
    const input = '```json\n{"slides":{"intro":"hello"}}\n```';
    expect(extractBalancedJson(input)).toBe('{"slides":{"intro":"hello"}}');
  });

  it('handles deeply nested objects', () => {
    const input = '{"a":{"b":{"c":{"d":"e"}}}}';
    expect(extractBalancedJson(input)).toBe('{"a":{"b":{"c":{"d":"e"}}}}');
  });

  it('handles arrays of objects', () => {
    const input = '{"items":[{"id":1},{"id":2}]}';
    expect(extractBalancedJson(input)).toBe('{"items":[{"id":1},{"id":2}]}');
  });

  it('ignores braces inside string values', () => {
    const input = '{"text":"some {braces} inside"}';
    expect(extractBalancedJson(input)).toBe('{"text":"some {braces} inside"}');
  });

  it('handles escaped quotes inside strings', () => {
    const input = '{"text":"she said \\"hi\\" loudly"}';
    expect(extractBalancedJson(input)).toBe('{"text":"she said \\"hi\\" loudly"}');
  });

  it('handles escaped backslashes', () => {
    const input = '{"path":"C:\\\\Users\\\\test"}';
    expect(extractBalancedJson(input)).toBe('{"path":"C:\\\\Users\\\\test"}');
  });

  it('returns null when there is no JSON', () => {
    const input = 'just some prose with no braces at all';
    expect(extractBalancedJson(input)).toBeNull();
  });

  it('returns the first balanced block when multiple exist', () => {
    const input = '{"first":1}\n\n{"second":2}';
    expect(extractBalancedJson(input)).toBe('{"first":1}');
  });

  it('returns null when braces never balance', () => {
    const input = '{"never":"closed"';
    expect(extractBalancedJson(input)).toBeNull();
  });

  it('handles realistic Claude response with thinking-style preamble', () => {
    const input = `Let me work through this brief carefully.

Looking at the strategic problem, I see three candidate concepts.

{"rankedConcepts":[{"conceptId":"next-stop","slot":"A","confidence":"strong"}],"topLineNote":null}

These are ranked in order of strategic fit.`;
    expect(extractBalancedJson(input)).toBe(
      '{"rankedConcepts":[{"conceptId":"next-stop","slot":"A","confidence":"strong"}],"topLineNote":null}'
    );
  });

  it('parses round-trip cleanly through JSON.parse', () => {
    const input = 'Result: {"a":1,"nested":{"b":[1,2,3]}} - done';
    const extracted = extractBalancedJson(input);
    expect(extracted).not.toBeNull();
    const parsed = JSON.parse(extracted!);
    expect(parsed).toEqual({ a: 1, nested: { b: [1, 2, 3] } });
  });
});
