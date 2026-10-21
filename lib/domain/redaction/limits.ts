// Text limits (architecture §6.2). Oversize input is rejected for an explicit shorten/select step —
// never silently truncated. Lengths count Unicode code points.

export const TEXT_LIMITS = {
  /** Total extracted CV text after parsing. */
  extractedCv: 50_000,
  /** Redacted CV characters sent to extraction. */
  cvExtractionInput: 12_000,
  /** Pasted job description. */
  jobDescription: 12_000,
  /** Advisor question. */
  advisorQuestion: 2_000,
} as const;

export type TextLimitKind = keyof typeof TEXT_LIMITS;

export type TextLimitResult =
  | { ok: true; length: number }
  | { ok: false; reason: "empty" | "too-long"; length: number; limit: number };

export function checkTextLimit(text: string, kind: TextLimitKind): TextLimitResult {
  const limit = TEXT_LIMITS[kind];
  const length = Array.from(text).length;
  if (text.trim().length === 0) return { ok: false, reason: "empty", length, limit };
  return length > limit ? { ok: false, reason: "too-long", length, limit } : { ok: true, length };
}
