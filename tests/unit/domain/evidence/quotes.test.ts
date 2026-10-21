import { describe, expect, it } from "vitest";
import evidence from "@/tests/fixtures/contracts/evidence.example.json";
import { EvidenceProvenanceSchema, QuoteVerificationSchema } from "@/types/evidence";
import {
  evidenceMatchesText,
  extractedEvidence,
  locateQuote,
  normalizeWithMap,
  occupationInferredEvidence,
  provenanceLabel,
  selfReportedEvidence,
  verifyQuotes,
} from "@/lib/domain/evidence/quotes";
import { redactContacts } from "@/lib/domain/redaction/redact";

// Synthetic, fictional CV text only.

const slice = (text: string, span: { start: number; end: number } | null) => (span ? text.slice(span.start, span.end) : null);

describe("normalization with offset map", () => {
  it("collapses whitespace and unifies quotes and dashes", () => {
    const n = normalizeWithMap("  Led  the “night’s”\tshift — 3–5 crews  ");
    expect(n.text).toBe(`Led the "night's" shift - 3-5 crews`);
    expect(n.starts).toHaveLength(n.text.length);
  });
  it("drops zero-width and soft-hyphen characters", () => {
    expect(normalizeWithMap("main­te​nance").text).toBe("maintenance");
  });
});

describe("locating quotes in persisted minimized text", () => {
  const persisted = "Summary:\n  Maintained  gas\ncompressors — “preventive” plans for 3–5 sites.\r\nIt’s fine.";

  it.each([
    ["maintained gas compressors", null],
    ["Maintained gas compressors", "Maintained  gas\ncompressors"],
    ['compressors - "preventive" plans', "compressors — “preventive” plans"],
    ["3-5 sites.", "3–5 sites."],
    ["sites. It's fine", "sites.\r\nIt’s fine"],
    ["  Maintained gas  ", "Maintained  gas"],
  ])("%j → exact original slice", (quote, expected) => {
    expect(slice(persisted, locateQuote(persisted, quote))).toBe(expected);
  });

  it("returns null for empty or whitespace-only quotes", () => {
    expect(locateQuote(persisted, "")).toBeNull();
    expect(locateQuote(persisted, " \n ")).toBeNull();
  });

  it("returns the first occurrence deterministically", () => {
    const text = "PLC wiring. Later, PLC wiring again.";
    expect(locateQuote(text, "PLC wiring")).toEqual({ start: 0, end: 10 });
  });

  it("offsets point into minimized text, not the original upload", () => {
    const original = "Contact: tech@example.com +880 1712 345678\nMaintained gas compressors daily.";
    const minimized = redactContacts(original).text;
    const p = extractedEvidence(minimized, "Maintained gas compressors");
    expect(p).not.toBeNull();
    if (p?.kind !== "extracted") throw new Error("expected extracted");
    expect(minimized.slice(p.span.start, p.span.end)).toBe("Maintained gas compressors");
    expect(original.slice(p.span.start, p.span.end)).not.toBe("Maintained gas compressors");
    expect(evidenceMatchesText(minimized, p)).toBe(true);
    expect(evidenceMatchesText(original, p)).toBe(false);
    expect(extractedEvidence(minimized, "tech@example.com")).toBeNull();
  });
});

describe("verification counts", () => {
  it("keeps located quotes by index and only counts dropped ones", () => {
    const text = "Fictional CV: maintained gas compressors and HVAC units.";
    const v = QuoteVerificationSchema.parse(verifyQuotes(text, ["maintained gas compressors", "invented claim", "HVAC  units", ""]));
    expect(v.located.map((l) => l.index)).toEqual([0, 2]);
    expect(v.droppedCount).toBe(2);
    expect(JSON.stringify(v)).not.toContain("invented");
  });
  it("reproduces the locked evidence.example.json span", () => {
    const text = "Experience: maintained gas compressors";
    const fixture = EvidenceProvenanceSchema.parse(evidence.provenances[0]);
    expect(extractedEvidence(text, "maintained gas compressors")).toEqual(fixture);
  });
});

describe("provenance kinds stay distinct", () => {
  it("labels extracted, inferred and self-reported separately", () => {
    const kinds = [
      extractedEvidence("Fictional: welded frames", "welded frames"),
      occupationInferredEvidence("49-9041.00", "onet:2.B.3.l"),
      selfReportedEvidence(),
    ].map((p) => (p ? EvidenceProvenanceSchema.parse(p) : null));
    expect(kinds.map((p) => p && provenanceLabel(p))).toEqual(["From your CV", "Inferred from a prior role", "Self-reported"]);
    expect(selfReportedEvidence()).toEqual({ kind: "self-reported" });
  });
  it("rejects a stale span", () => {
    expect(evidenceMatchesText("short", { kind: "extracted", quote: "longer quote", span: { start: 0, end: 12 } })).toBe(false);
  });
});

describe("U18 review fix #9: NFC, combining marks and surrogate pairs", () => {
  it("matches NFD quotes against NFC text and vice versa, slicing whole clusters", () => {
    const nfc = "Worked at Café Fictional for 2 years";
    const nfd = "Worked at Café Fictional for 2 years";
    expect(slice(nfc, locateQuote(nfc, "Café Fictional"))).toBe("Café Fictional");
    expect(slice(nfd, locateQuote(nfd, "Café Fictional"))).toBe("Café Fictional");
  });
  it("never ends a span between a base character and its combining mark", () => {
    const nfd = "Café shifts";
    expect(locateQuote(nfd, "Cafe")).toBeNull();
  });
  it("keeps emoji surrogate pairs and ZWJ sequences intact", () => {
    const text = "Mentor \u{1F469}‍\u{1F4BB} club lead \u{1F680} launches";
    const span = locateQuote(text, "\u{1F469}‍\u{1F4BB} club lead \u{1F680}");
    expect(slice(text, span)).toBe("\u{1F469}‍\u{1F4BB} club lead \u{1F680}");
    const rocket = locateQuote(text, "\u{1F680}");
    expect(rocket && rocket.end - rocket.start).toBe(2);
  });
  it("rejects quotes with lone surrogates", () => {
    const text = "Mentor \u{1F680} launches";
    expect(locateQuote(text, "\uD83D")).toBeNull();
    expect(locateQuote(text, "\uDE80 launches")).toBeNull();
  });
});
