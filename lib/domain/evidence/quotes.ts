import type { EvidenceProvenance, QuoteSpan, QuoteVerification } from "@/types/evidence";

// Quote verification against the PERSISTED MINIMIZED text (architecture §6.2, I08). Normalizes whitespace,
// quote marks and dashes (plus NFC) while keeping a map back to original UTF-16 offsets. Offsets are never taken from a model.

const QUOTE_SINGLE = /[‘’‚‛′`´]/;
const QUOTE_DOUBLE = /[“”„‟″«»]/;
const DASH = /[‐-―−﹘﹣－]/;
const SPACE = /[\s  -   　]/;
const ZERO_WIDTH = /[​-‍⁠﻿­]/;
const COMBINING = /\p{M}/u;
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

export interface NormalizedText {
  text: string;
  /** For each normalized UTF-16 unit i: [start, end) of its whole cluster in the original string. */
  starts: number[];
  ends: number[];
}

/**
 * Collapse whitespace runs to one space, unify quotes/dashes, drop zero-width/soft-hyphen chars, apply NFC, trim.
 * Works on clusters (a code point plus following combining marks), so a span never splits a surrogate pair or
 * separates a base character from its marks.
 */
export function normalizeWithMap(original: string): NormalizedText {
  const out: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  const unitLen = (at: number) => ((original.codePointAt(at) ?? 0) > 0xffff ? 2 : 1);
  let i = 0;
  while (i < original.length) {
    let j = i + unitLen(i);
    while (j < original.length && COMBINING.test(String.fromCodePoint(original.codePointAt(j) ?? 0))) j += unitLen(j);
    const chunk = original.slice(i, j);
    const begin = i;
    i = j;
    const single = chunk.length === 1;
    if (single && ZERO_WIDTH.test(chunk)) continue;
    if (single && SPACE.test(chunk)) {
      if (out.length === 0) continue; // leading whitespace
      if (out[out.length - 1] === " ") {
        ends[ends.length - 1] = j;
        continue;
      }
      out.push(" ");
      starts.push(begin);
      ends.push(j);
      continue;
    }
    const mapped =
      single && QUOTE_SINGLE.test(chunk) ? "'"
      : single && QUOTE_DOUBLE.test(chunk) ? '"'
      : single && DASH.test(chunk) ? "-"
      : chunk.normalize("NFC");
    for (let k = 0; k < mapped.length; k++) {
      out.push(mapped.charAt(k));
      starts.push(begin);
      ends.push(j);
    }
  }
  if (out[out.length - 1] === " ") {
    out.pop();
    starts.pop();
    ends.pop();
  }
  return { text: out.join(""), starts, ends };
}

/**
 * Locate a quote's first cluster-aligned occurrence; the span always slices the original (persisted) text.
 * Null when absent, empty or containing a lone surrogate.
 */
export function locateQuote(persistedText: string, quote: string, from: NormalizedText = normalizeWithMap(persistedText)): QuoteSpan | null {
  if (LONE_SURROGATE.test(quote)) return null;
  const needle = normalizeWithMap(quote).text;
  if (needle.length === 0) return null;
  const { text, starts, ends } = from;
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) {
    const last = at + needle.length - 1;
    const start = starts[at];
    const end = ends[last];
    if (start === undefined || end === undefined) return null;
    const alignedStart = at === 0 || starts[at - 1] !== start;
    const alignedEnd = last === text.length - 1 || starts[last + 1] !== starts[last];
    if (alignedStart && alignedEnd) return { start, end };
  }
  return null;
}

/** Verify model-proposed quotes; unlocatable items are dropped and only counted (no content retained). */
export function verifyQuotes(persistedText: string, quotes: readonly string[]): QuoteVerification {
  const norm = normalizeWithMap(persistedText);
  const located: QuoteVerification["located"] = [];
  quotes.forEach((q, index) => {
    const span = locateQuote(persistedText, q, norm);
    if (span) located.push({ index, span });
  });
  return { located, droppedCount: quotes.length - located.length };
}

/** Extracted provenance whose quote is the exact persisted slice at its span; null when the quote cannot be verified. */
export function extractedEvidence(persistedText: string, proposedQuote: string): EvidenceProvenance | null {
  const span = locateQuote(persistedText, proposedQuote);
  return span ? { kind: "extracted", quote: persistedText.slice(span.start, span.end), span } : null;
}

export const occupationInferredEvidence = (fromRoleSoc: string, sourceRequirementId: string): EvidenceProvenance => ({
  kind: "occupation-inferred",
  fromRoleSoc,
  sourceRequirementId,
});

/** Manual additions are self-reported — never given a fake CV quote. */
export const selfReportedEvidence = (): EvidenceProvenance => ({ kind: "self-reported" });

/** True when an extracted provenance's span still points at its quote in the persisted text; non-extracted → true. */
export function evidenceMatchesText(persistedText: string, p: EvidenceProvenance): boolean {
  if (p.kind !== "extracted") return true;
  return p.span.end <= persistedText.length && persistedText.slice(p.span.start, p.span.end) === p.quote;
}

/** Display label kept separate from coverage state (§7.2). */
export function provenanceLabel(p: EvidenceProvenance): "From your CV" | "Inferred from a prior role" | "Self-reported" {
  switch (p.kind) {
    case "extracted":
      return "From your CV";
    case "occupation-inferred":
      return "Inferred from a prior role";
    case "self-reported":
      return "Self-reported";
  }
}
