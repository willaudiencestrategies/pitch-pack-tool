// Post-compile guarantees for the output markdown.
//
// The final brief is LLM-compiled, so structural requirements that the client
// has promised (Richard's spec) cannot be left to prompt adherence alone.
// This runs deterministically on the compiled markdown before it is shown,
// copied or exported.

/**
 * Guarantee the CREATIVE TENETS section states it was built solely from the
 * primary audience. No-op when there are no secondary audiences, when the
 * statement is already present under the heading, or when no CREATIVE TENETS
 * heading can be found (nothing sane to anchor to).
 */
export function ensureTenetsProvenance(
  markdown: string,
  primaryAudienceName: string,
  hasSecondaryAudiences: boolean
): string {
  if (!hasSecondaryAudiences || !primaryAudienceName || !markdown) return markdown;

  const headingRegex = /^(#{1,4}\s*CREATIVE TENETS[^\n]*)$/im;
  const match = markdown.match(headingRegex);
  if (!match || match.index === undefined) return markdown;

  // Look at the section body (up to the next heading) for an existing statement
  const afterHeading = markdown.slice(match.index + match[0].length);
  const nextHeading = afterHeading.search(/^#{1,4}\s+\S/m);
  const sectionBody = nextHeading >= 0 ? afterHeading.slice(0, nextHeading) : afterHeading;
  if (/primary audience/i.test(sectionBody)) return markdown;

  const statement = `\n\n*These tenets are built solely from the primary audience — ${primaryAudienceName} — and their insights.*`;
  return (
    markdown.slice(0, match.index + match[0].length) +
    statement +
    afterHeading
  );
}
