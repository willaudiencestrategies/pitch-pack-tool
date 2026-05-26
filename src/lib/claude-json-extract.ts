/**
 * Walks the response text and returns the first syntactically balanced JSON
 * block (object or array). Tolerates leading/trailing prose and markdown
 * fences that wrap the JSON. Cannot repair malformed JSON within the block
 * itself (e.g. unescaped quotes inside string values) - those still fail
 * downstream and surface via the diagnostic error.
 */
export function extractBalancedJson(text: string): string | null {
  const start = text.search(/[{[]/);
  if (start === -1) return null;

  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) {
      depth++;
    } else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}
