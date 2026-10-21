import { describe, expect, it } from "vitest";
import scoring from "@/tests/fixtures/contracts/scoring.example.json";
import {
  FitBreakdownSchema,
  OpportunityResultSchema,
  ReachBreakdownSchema,
  ScoredRequirementSchema,
  WorkloadBreakdownSchema,
  type ScoredRequirement,
  type WorkloadBreakdown,
} from "@/types/scoring";
import { computeCoverage, coverageState, indexUserLevels } from "@/lib/domain/scoring/coverage";
import { computeFit, type FitInput } from "@/lib/domain/scoring/fit";
import { opportunityScore, scoreRole } from "@/lib/domain/scoring/opportunity";
import { computeReach, zoneGap } from "@/lib/domain/scoring/reach";
import {
  buildRoleRequirements,
  dedupeRequirements,
  extractedSuggestionLevel,
  inferredDescriptorLevel,
  normalizeDescriptor,
  normalizeSoftware,
  resolveEffectiveLevel,
  softwareProficiencyLevel,
  type DescriptorRow,
} from "@/lib/domain/scoring/requirements";
import { SCORING_VERSION, WEIGHTS } from "@/lib/domain/scoring/weights";

// Synthetic test vectors only (architecture §7); not product data.

const IMP = { min: 1, max: 5 };
const LVL = { min: 0, max: 7 };
const desc = (over: Partial<DescriptorRow> = {}): DescriptorRow => ({
  id: "onet:2.A.1.a",
  category: "essential",
  importance: 4.2,
  importanceScale: IMP,
  level: 4.2,
  levelScale: LVL,
  suppressed: false,
  sourceRef: "synthetic:a",
  ...over,
});
const req = (id: string, kind: "descriptor" | "software", weight = 1, requiredLevel = 0.5): ScoredRequirement => ({
  id,
  kind,
  category: kind === "software" ? "software" : "essential",
  weight,
  requiredLevel,
  sourceRefs: [`synthetic:${id}`],
});
const workload = (totalHours: number, weeklyHours = 8): WorkloadBreakdown => ({
  totalHours,
  weeklyHours,
  weeks: totalHours / weeklyHours,
  resourceItems: [],
  uncoveredItems: [],
});
const fitInput = (over: Partial<FitInput>): FitInput => ({
  requirements: [],
  userLevels: [],
  neighbors: [],
  hasConfirmedMappedPriorRole: false,
  confirmedDescriptorEvidenceCount: 0,
  ...over,
});
const neutralDemand = { asOf: "2026-10-21", role: null, cohort: [], sector: [], forecast: null };

describe("baseline constants", () => {
  it("records astra-v1 baseline values", () => {
    expect(SCORING_VERSION).toBe("astra-v1");
    expect(WEIGHTS.opportunity).toEqual({ fitExponent: 0.5, reachExponent: 0.25, demandExponent: 0.25 });
    expect(WEIGHTS.diversity).toEqual({ topN: 10, maxPerMinorGroup: 3 });
  });
});

describe("§7.1 requirement normalization", () => {
  it("normalizes importance and level on the verified scale", () => {
    const r = normalizeDescriptor(desc({ importance: 4, level: 3.5 }));
    expect(r?.weight).toBeCloseTo(0.75, 12);
    expect(r?.requiredLevel).toBeCloseTo(0.5, 12);
  });
  it("includes exactly at 0.50 importance and excludes below", () => {
    expect(normalizeDescriptor(desc({ importance: 3 }))?.weight).toBe(0.5);
    expect(normalizeDescriptor(desc({ importance: 2.99 }))).toBeNull();
  });
  it("excludes suppressed, zero-required, missing and degenerate-scale rows", () => {
    expect(normalizeDescriptor(desc({ suppressed: true }))).toBeNull();
    expect(normalizeDescriptor(desc({ level: 0 }))).toBeNull();
    expect(normalizeDescriptor(desc({ importance: null }))).toBeNull();
    expect(normalizeDescriptor(desc({ importanceScale: { min: 3, max: 3 } }))).toBeNull();
    expect(normalizeDescriptor(desc({ level: Number.NaN }))).toBeNull();
  });
  it("weights software by hot and in-demand flags at required level 0.50", () => {
    const base = { id: "onet-sw:1", sourceRef: "s" };
    expect(normalizeSoftware({ ...base, hot: false, inDemand: false }).weight).toBe(0.5);
    expect(normalizeSoftware({ ...base, hot: true, inDemand: false }).weight).toBe(0.75);
    expect(normalizeSoftware({ ...base, hot: true, inDemand: true })).toMatchObject({ weight: 1, requiredLevel: 0.5, category: "software" });
  });
  it("deduplicates keeping the strongest weight and all source refs", () => {
    const out = dedupeRequirements([
      { ...req("onet:x", "descriptor", 0.6, 0.4), sourceRefs: ["b"] },
      { ...req("onet:x", "descriptor", 0.9, 0.3), sourceRefs: ["a", "b"] },
    ]);
    expect(out).toEqual([{ ...req("onet:x", "descriptor", 0.9, 0.4), sourceRefs: ["a", "b"] }]);
  });
  it("marks a role with no usable requirements unscorable (no titles/rows)", () => {
    expect(buildRoleRequirements([], [])).toEqual({ kind: "unscorable", reason: "no-usable-requirements" });
    expect(buildRoleRequirements([desc({ suppressed: true }), desc({ importance: 1 })], []).kind).toBe("unscorable");
  });
  it("maps user levels", () => {
    expect(([1, 2, 3, 4] as const).map(softwareProficiencyLevel)).toEqual([0.25, 0.5, 0.75, 1]);
    expect(inferredDescriptorLevel(0.8, 1)).toBeCloseTo(0.4, 12);
    expect(inferredDescriptorLevel(0.8, 5)).toBeCloseTo(0.8, 12);
    expect(inferredDescriptorLevel(0.8, null)).toBe(0);
    expect(extractedSuggestionLevel(3)).toBeCloseTo(0.6, 12);
    expect(extractedSuggestionLevel(5)).toBe(0.8);
  });
  it("honours a lower user override over higher evidence", () => {
    expect(resolveEffectiveLevel(0.25, [0.75, 1])).toBe(0.25);
    expect(resolveEffectiveLevel(null, [0.5, 0.75])).toBe(0.75);
    expect(resolveEffectiveLevel(null, [])).toBeNull();
  });
});

describe("§7.2 coverage and states", () => {
  it("assigns states at the exact thresholds", () => {
    expect(coverageState(0.9, 0)).toBe("have");
    expect(coverageState(0.8999, 0)).toBe("partial");
    expect(coverageState(0.4, 0)).toBe("partial");
    expect(coverageState(0.39, 0.3)).toBe("transferable");
    expect(coverageState(0.39, 0.29)).toBe("to-build");
  });
  it("credits software neighbors only at similarity ≥0.80 and picks the best, either direction", () => {
    const r = req("onet-sw:target", "software");
    const levels = indexUserLevels([
      { id: "onet-sw:a", level: 1 },
      { id: "onet-sw:b", level: 1 },
      { id: "onet-sw:c", level: 1 },
    ]);
    const c = computeCoverage(r, levels, [
      { fromId: "onet-sw:target", toId: "onet-sw:a", similarity: 0.79 },
      { fromId: "onet-sw:b", toId: "onet-sw:target", similarity: 0.85 },
      { fromId: "onet-sw:target", toId: "onet-sw:c", similarity: 0.85 },
    ]);
    expect(c.neighbor).toBeCloseTo(0.6 * 0.85, 12);
    expect(c.neighborVia).toBe("onet-sw:b"); // tie → lowest ID
    expect(c).toMatchObject({ direct: 0, state: "transferable" });
    expect(c.effective).toBe(c.neighbor);
  });
  it("gives descriptors no neighbor credit", () => {
    const c = computeCoverage(req("onet:d", "descriptor"), indexUserLevels([{ id: "onet:e", level: 1 }]), [
      { fromId: "onet:d", toId: "onet:e", similarity: 1 },
    ]);
    expect(c).toMatchObject({ neighbor: 0, neighborVia: null, state: "to-build", effective: 0 });
  });
  it("rejects duplicate resolved user levels", () => {
    expect(() => indexUserLevels([{ id: "onet:a", level: 1 }, { id: "onet:a", level: 0 }])).toThrow(RangeError);
  });
});

describe("§7.2 Fit", () => {
  it("uses descriptors only when the role has no software (no-software case)", () => {
    const out = computeFit(fitInput({ requirements: [req("onet:a", "descriptor", 1, 0.5)], userLevels: [{ id: "onet:a", level: 0.25 }] }));
    if (out.kind !== "scored") throw new Error("expected scored");
    expect(FitBreakdownSchema.parse(out.fit)).toMatchObject({ fit: 0.5, fitDesc: 0.5, fitTools: null, alpha: null });
  });
  it("blends with alpha 0.30 without a confirmed prior occupation (no-occupation case) and 0.50 with one", () => {
    const base = {
      requirements: [req("onet:a", "descriptor"), req("onet-sw:b", "software")],
      userLevels: [{ id: "onet:a", level: 0.5 }],
    };
    const weak = computeFit(fitInput(base));
    const strong = computeFit(fitInput({ ...base, hasConfirmedMappedPriorRole: true }));
    const evid = computeFit(fitInput({ ...base, confirmedDescriptorEvidenceCount: 3 }));
    if (weak.kind !== "scored" || strong.kind !== "scored" || evid.kind !== "scored") throw new Error("expected scored");
    expect(weak.fit).toMatchObject({ alpha: 0.3, fitDesc: 1, fitTools: 0 });
    expect(weak.fit.fit).toBeCloseTo(0.3, 12);
    expect(strong.fit.fit).toBe(0.5);
    expect(evid.fit.alpha).toBe(0.5);
  });
  it("weights coverage by requirement weight and yields zero (not NaN) for an empty profile", () => {
    const out = computeFit(fitInput({ requirements: [req("onet:a", "descriptor", 1), req("onet:b", "descriptor", 0.5)], userLevels: [{ id: "onet:b", level: 0.5 }] }));
    if (out.kind !== "scored") throw new Error("expected scored");
    expect(out.fit.fit).toBeCloseTo(0.5 / 1.5, 12);
    const empty = computeFit(fitInput({ requirements: [req("onet:a", "descriptor")] }));
    if (empty.kind !== "scored") throw new Error("expected scored");
    expect(empty.fit.fit).toBe(0);
  });
  it("is unscorable with no requirements", () => {
    expect(computeFit(fitInput({})).kind).toBe("unscorable");
  });
});

describe("§7.3 Reach", () => {
  it("is 1 at W=0 and 0.5 at W=12", () => {
    expect(computeReach({ workload: workload(0), targetZone: null, userZone: null }).reach).toBe(1);
    expect(computeReach({ workload: workload(96), targetZone: null, userZone: null }).reach).toBe(0.5);
  });
  it("applies 0.6^zoneGap only when both zones share a scale", () => {
    const z = (zone: number, scaleId = "onet:job-zone") => ({ zone, scaleId });
    const r = computeReach({ workload: workload(0), targetZone: z(4), userZone: z(2) });
    expect(ReachBreakdownSchema.parse(r)).toMatchObject({ zoneGap: 2, zoneKnown: true, longReach: true });
    expect(r.reach).toBeCloseTo(0.36, 12);
    expect(zoneGap(z(2), z(4))).toBe(0);
  });
  it("treats a missing or mismatched zone as unknown with zero penalty", () => {
    const missing = computeReach({ workload: workload(0), targetZone: { zone: 4, scaleId: "s" }, userZone: null });
    expect(missing).toMatchObject({ reach: 1, zoneGap: null, zoneKnown: false, longReach: false });
    expect(zoneGap({ zone: 4, scaleId: "a" }, { zone: 1, scaleId: "b" })).toBeNull();
  });
  it("flags long reach above 26 weeks", () => {
    expect(computeReach({ workload: workload(26 * 8), targetZone: null, userZone: null }).longReach).toBe(false);
    expect(computeReach({ workload: workload(26 * 8 + 1), targetZone: null, userZone: null }).longReach).toBe(true);
  });
  it("rejects inconsistent workload", () => {
    expect(() => computeReach({ workload: { ...workload(96), weeks: 3 }, targetZone: null, userZone: null })).toThrow(RangeError);
  });
});

describe("§7.5 Opportunity and the worked examples", () => {
  it("Fit=1, W=0, zoneGap=0, Demand=1 → 100", () => {
    expect(opportunityScore(1, 1, 1)).toBe(100);
  });
  it("zero component yields zero; out-of-range input throws", () => {
    expect(opportunityScore(0, 1, 1)).toBe(0);
    expect(opportunityScore(1, 1, 0)).toBe(0);
    expect(() => opportunityScore(1.2, 1, 1)).toThrow(RangeError);
    expect(() => opportunityScore(Number.NaN, 1, 1)).toThrow(RangeError);
  });
  it("reproduces the locked scoring.example.json vector (Fit 0.64, W 12, Demand 0.5 → ≈56.57)", () => {
    const fixture = OpportunityResultSchema.parse(scoring.opportunity);
    const requirement = ScoredRequirementSchema.parse(scoring.requirement);
    const out = scoreRole({
      soc: fixture.soc,
      fit: fitInput({ requirements: [requirement], userLevels: [{ id: requirement.id, level: 0.384 }], hasConfirmedMappedPriorRole: true }),
      reach: { workload: WorkloadBreakdownSchema.parse(scoring.workload), targetZone: { zone: 3, scaleId: "onet:job-zone" }, userZone: { zone: 3, scaleId: "onet:job-zone" } },
      demand: neutralDemand,
    });
    if (out.kind !== "scored") throw new Error("expected scored");
    const { opportunity, ...rest } = OpportunityResultSchema.parse(out.result);
    const { opportunity: expected, ...expectedRest } = fixture;
    expect(rest).toEqual(expectedRest);
    // The fixture literal is one ulp from IEEE evaluation of the formula; full precision, no rounding.
    expect(opportunity).toBeCloseTo(expected, 12);
    expect(opportunity).not.toBe(Math.round(opportunity));
  });
  it("returns an unscorable outcome rather than a score", () => {
    const out = scoreRole({ soc: "11-0000.00", fit: fitInput({}), reach: { workload: workload(0), targetZone: null, userZone: null }, demand: neutralDemand });
    expect(out).toEqual({ kind: "unscorable", soc: "11-0000.00", reason: "no-usable-requirements" });
  });
});

describe("U14 review fixes", () => {
  it("F5a/b: includes similarity exactly 0.80 and scales by partial neighbor proficiency", () => {
    const c = computeCoverage(req("onet-sw:t", "software", 1, 0.5), indexUserLevels([{ id: "onet-sw:n", level: 0.25 }]), [
      { fromId: "onet-sw:t", toId: "onet-sw:n", similarity: 0.8 },
    ]);
    // 0.6 × 0.80 × min(1, 0.25/0.5) = 0.24
    expect(c.neighbor).toBeCloseTo(0.24, 12);
    expect(c).toMatchObject({ neighborVia: "onet-sw:n", state: "to-build" });
  });
  it("F5i: two confirmed descriptor evidences keep alpha 0.30", () => {
    const out = computeFit(
      fitInput({ requirements: [req("onet:a", "descriptor"), req("onet-sw:b", "software")], confirmedDescriptorEvidenceCount: 2 }),
    );
    if (out.kind !== "scored") throw new Error("expected scored");
    expect(out.fit.alpha).toBe(0.3);
  });
  it("F1: rejects duplicate requirement IDs", () => {
    expect(() => computeFit(fitInput({ requirements: [req("onet:a", "descriptor"), req("onet:a", "descriptor")] }))).toThrow(RangeError);
  });
  it("F6: rejects out-of-contract inputs early", () => {
    expect(() => indexUserLevels([{ id: "onet:a", level: -0.1 }])).toThrow(RangeError);
    expect(() => indexUserLevels([{ id: "onet:a", level: 1.5 }])).toThrow(RangeError);
    expect(() => computeCoverage({ ...req("onet:a", "descriptor"), requiredLevel: 0 }, new Map(), [])).toThrow(RangeError);
    expect(() =>
      computeCoverage(req("onet-sw:a", "software"), indexUserLevels([{ id: "onet-sw:b", level: 1 }]), [{ fromId: "onet-sw:a", toId: "onet-sw:b", similarity: 1.2 }]),
    ).toThrow(RangeError);
    expect(() => computeFit(fitInput({ requirements: [{ ...req("onet:a", "descriptor"), weight: 0.2 }] }))).toThrow(/RangeError|weight/);
    expect(() => computeFit(fitInput({ requirements: [{ ...req("onet:a", "descriptor"), weight: 0.2 }] }))).toThrow(RangeError);
  });
});
