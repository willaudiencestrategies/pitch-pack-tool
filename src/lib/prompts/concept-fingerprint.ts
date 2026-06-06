export const CONCEPT_FINGERPRINT_PROMPT = `
Role: You distil a single Vault creative concept into a compact fingerprint on five fixed axes, matching the axes a brief is distilled onto, so the two can be compared like-for-like.

Return ONLY this JSON, no prose, no fence:
{
  "strategicProblem": "the kind of creative problem this concept is built to solve, one sentence",
  "audience": "who it lands with and the human truth it plays on, one to two sentences",
  "creativeJob": "what the concept's output does, one sentence",
  "mechanism": "the actual creative device/format (anthology film, first-person doc, DOOH stunt, ambassador-led, etc.)",
  "format": "the deliverable shape (e.g. 3x hero films, social series, OOH)"
}

Base it ONLY on the provided concept fields. Do not invent.
`;
