import { describe, expect, it } from "vitest";
import { EvidenceProvenanceSchema, QuoteVerificationSchema, RedactionResultSchema } from "@/types/evidence";
import { ProvenanceSchema } from "@/types/provenance";
import {
  OpportunityResultSchema,
  ReachBreakdownSchema,
  RequirementCoverageSchema,
  ScoredRequirementSchema,
  WorkloadBreakdownSchema,
} from "@/types/scoring";
import evidence from "@/tests/fixtures/contracts/evidence.example.json";
import scoring from "@/tests/fixtures/contracts/scoring.example.json";

describe("locked contract examples", () => {
  it("validate the scoring examples", () => {
    expect(ScoredRequirementSchema.parse(scoring.requirement).id).toBe("onet:2.A.1.a");
    expect(OpportunityResultSchema.parse(scoring.opportunity).scoringVersion).toBe("astra-v1");
    const workload = WorkloadBreakdownSchema.parse(scoring.workload);
    expect(workload.weeks).toBe(12);
    // §7.3: H = unique resource workloads + uncovered workloads; W = H / weekly hours.
    const items = [...workload.resourceItems, ...workload.uncoveredItems].reduce((sum, i) => sum + i.hours, 0);
    expect(items).toBeCloseTo(workload.totalHours, 9);
    expect(workload.totalHours / workload.weeklyHours).toBe(workload.weeks);
    // §7.3: residual = 1 − max effective coverage served (1 with no coverage evidence); hours = base × residual.
    const opportunity = OpportunityResultSchema.parse(scoring.opportunity);
    const residualOf = (id: string) => {
      const c = opportunity.fit.coverages.find((x) => x.requirementId === id);
      return c ? 1 - c.effective : 1;
    };
    for (const r of workload.resourceItems) {
      expect(r.residual).toBeCloseTo(Math.max(...r.servesRequirementIds.map(residualOf)), 9);
      expect(r.hours).toBeCloseTo(r.resourceHours * r.residual, 9);
    }
    for (const u of workload.uncoveredItems) {
      expect(u.residual).toBeCloseTo(residualOf(u.requirementId), 9);
      expect(u.hours).toBeCloseTo(u.defaultHours * u.residual, 9);
    }
  });

  it("enforces cross-field scoring rules", () => {
    expect(ScoredRequirementSchema.safeParse({ ...scoring.requirement, kind: "software" }).success).toBe(false);
    const cov = scoring.opportunity.fit.coverages[0];
    expect(RequirementCoverageSchema.safeParse({ ...cov, effective: 0.5 }).success).toBe(false);
    const reach = scoring.opportunity.reach;
    expect(ReachBreakdownSchema.safeParse({ ...reach, zoneGap: null }).success).toBe(false);
    expect(ReachBreakdownSchema.safeParse({ ...reach, zoneGap: null, zoneKnown: false }).success).toBe(true);
  });

  it("requires requirement weights of at least 0.50 (§7.1 inclusion rule)", () => {
    expect(ScoredRequirementSchema.safeParse({ ...scoring.requirement, weight: 0.49 }).success).toBe(false);
    expect(ScoredRequirementSchema.safeParse({ ...scoring.requirement, weight: 0.5 }).success).toBe(true);
  });

  it("validate the evidence examples", () => {
    expect(evidence.provenances.map((p) => EvidenceProvenanceSchema.parse(p).kind)).toEqual(["extracted", "occupation-inferred", "self-reported"]);
    expect(RedactionResultSchema.parse(evidence.redaction).removed).toHaveLength(1);
    expect(QuoteVerificationSchema.parse(evidence.verification).droppedCount).toBe(2);
  });

  it("rejects invalid values instead of coercing them", () => {
    expect(ScoredRequirementSchema.safeParse({ ...scoring.requirement, weight: 0 }).success).toBe(false);
    expect(ScoredRequirementSchema.safeParse({ ...scoring.requirement, id: "no-namespace" }).success).toBe(false);
    expect(EvidenceProvenanceSchema.safeParse({ kind: "extracted", quote: "x", span: { start: 5, end: 5 } }).success).toBe(false);
    expect(ProvenanceSchema.safeParse({ kind: "unavailable", reason: "guessed" }).success).toBe(false);
  });
});
