import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import { SETUP_TIMEOUT_MS, setupTestDb } from "../setup/integration-db";

// Owner-scope constraints and private cascade deletion (U03 acceptance, I06/I07, architecture §5/§6.3).
let db: Db;
beforeAll(async () => {
  db = await setupTestDb();
  await db.occupation.create({
    data: { code: "onet:11-1111.00", title: "Synthetic role", description: "test", majorGroup: "11", minorGroup: "11-1", sourceVersion: "t1" },
  });
}, SETUP_TIMEOUT_MS);
afterAll(async () => {
  await db?.$disconnect();
});

const DAY = 86_400_000;
let seq = 0;

async function session() {
  seq += 1;
  return db.guestSession.create({ data: { tokenHash: `hash-${seq}`, expiresAt: new Date(Date.now() + 30 * DAY) } });
}

/** A guest profile with one row in every owner-scoped table (synthetic content only). */
async function populatedGuest() {
  const s = await session();
  const p = await db.profile.create({ data: { sessionId: s.id, country: "BD", preferences: {} } });
  await db.cvText.create({ data: { profileId: p.id, text: "Synthetic minimized text", contentHash: "h", parserVersion: "t1" } });
  await db.profileExperience.create({ data: { profileId: p.id, title: "Technician", mappingCandidates: [], provenance: "self-reported" } });
  await db.profileEducation.create({ data: { profileId: p.id, label: "Diploma", provenance: "self-reported" } });
  await db.profileSkill.create({ data: { profileId: p.id, kind: "software", rawName: "Excel", provenance: "self-reported", evidence: [], mappingCandidates: [] } });
  const run = await db.matchRun.create({ data: { profileId: p.id, profileRevision: 0, country: "BD", scoringVersion: "astra-v1", dataVersion: "t1", inputHash: "i" } });
  await db.match.create({ data: { matchRunId: run.id, occupationCode: "onet:11-1111.00", rank: 1, opportunity: 50, fit: 0.5, reach: 0.5, demand: 0.5, breakdown: {} } });
  const jt = await db.jobTarget.create({ data: { profileId: p.id, redactedText: "Synthetic JD" } });
  await db.jobRequirement.create({ data: { jobTargetId: jt.id, profileId: p.id, rawText: "SQL", quoteStart: 0, quoteEnd: 3, required: true, level: 0.5, levelAssumed: true } });
  await db.plan.create({ data: { profileId: p.id, targetKind: "job", jobTargetId: jt.id, inputHash: "j", catalogVersion: "t1", totalHours: 10, payload: {} } });
  await db.plan.create({ data: { profileId: p.id, targetKind: "occupation", occupationCode: "onet:11-1111.00", inputHash: "o", catalogVersion: "t1", totalHours: 5, payload: {} } });
  await db.planItemProgress.create({ data: { profileId: p.id, jobTargetId: jt.id, targetKey: `job:${jt.id}`, itemKey: "r1@v1", status: "done" } });
  await db.planItemProgress.create({ data: { profileId: p.id, targetKey: "occupation:onet:11-1111.00", itemKey: "r2@v1", status: "in-progress" } });
  await db.pathRun.create({ data: { profileId: p.id, profileRevision: 0, graphVersion: "t1", targetKey: "green", lens: "green", constraints: {}, paths: [] } });
  await db.analysisRun.create({ data: { sessionId: s.id, profileId: p.id, idempotencyKey: "k1", stage: "done", expiresAt: new Date(Date.now() + DAY) } });
  await db.llmCache.create({ data: { key: `personal-${p.id}`, scope: "personal", profileId: p.id, task: "explain", model: "m", promptVersion: "v1", payload: {}, expiresAt: new Date(Date.now() + DAY) } });
  return { s, p, jt };
}

const PRIVATE_TABLES = [
  "Profile", "CvText", "ProfileExperience", "ProfileEducation", "ProfileSkill", "MatchRun", "Match", "JobTarget",
  "JobRequirement", "Plan", "PlanItemProgress", "PathRun", "AnalysisRun", "LlmCache",
] as const;

async function countOwnedBy(profileId: string): Promise<Record<string, number>> {
  const [row] = await db.$queryRaw<Record<string, bigint>[]>`
    SELECT
      (SELECT count(*) FROM "Profile" WHERE id = ${profileId}::uuid) AS "Profile",
      (SELECT count(*) FROM "CvText" WHERE "profileId" = ${profileId}::uuid) AS "CvText",
      (SELECT count(*) FROM "ProfileExperience" WHERE "profileId" = ${profileId}::uuid) AS "ProfileExperience",
      (SELECT count(*) FROM "ProfileEducation" WHERE "profileId" = ${profileId}::uuid) AS "ProfileEducation",
      (SELECT count(*) FROM "ProfileSkill" WHERE "profileId" = ${profileId}::uuid) AS "ProfileSkill",
      (SELECT count(*) FROM "MatchRun" WHERE "profileId" = ${profileId}::uuid) AS "MatchRun",
      (SELECT count(*) FROM "Match" m JOIN "MatchRun" r ON r.id = m."matchRunId" WHERE r."profileId" = ${profileId}::uuid) AS "Match",
      (SELECT count(*) FROM "JobTarget" WHERE "profileId" = ${profileId}::uuid) AS "JobTarget",
      (SELECT count(*) FROM "JobRequirement" WHERE "profileId" = ${profileId}::uuid) AS "JobRequirement",
      (SELECT count(*) FROM "Plan" WHERE "profileId" = ${profileId}::uuid) AS "Plan",
      (SELECT count(*) FROM "PlanItemProgress" WHERE "profileId" = ${profileId}::uuid) AS "PlanItemProgress",
      (SELECT count(*) FROM "PathRun" WHERE "profileId" = ${profileId}::uuid) AS "PathRun",
      (SELECT count(*) FROM "AnalysisRun" WHERE "profileId" = ${profileId}::uuid) AS "AnalysisRun",
      (SELECT count(*) FROM "LlmCache" WHERE "profileId" = ${profileId}::uuid) AS "LlmCache"`;
  return Object.fromEntries(PRIVATE_TABLES.map((t) => [t, Number(row?.[t] ?? -1)]));
}

describe("private cascade deletion", () => {
  it("deleting a guest session removes every private row and preserves other owners, demos and reference data", async () => {
    const victim = await populatedGuest();
    const bystander = await populatedGuest();
    const demo = await db.profile.create({ data: { demoKey: "persona-technician", country: "BD", preferences: {} } });
    const general = await db.llmCache.create({ data: { key: "general-1", scope: "general", task: "outlook", model: "m", promptVersion: "v1", payload: {}, expiresAt: new Date(Date.now() + DAY) } });

    expect(Object.values(await countOwnedBy(victim.p.id)).every((n) => n >= 1)).toBe(true);

    await db.guestSession.delete({ where: { id: victim.s.id } });

    expect(await countOwnedBy(victim.p.id)).toEqual(Object.fromEntries(PRIVATE_TABLES.map((t) => [t, 0])));
    expect(await db.analysisRun.count({ where: { sessionId: victim.s.id } })).toBe(0);
    expect(Object.values(await countOwnedBy(bystander.p.id)).every((n) => n >= 1)).toBe(true);
    expect(await db.profile.findUnique({ where: { id: demo.id } })).not.toBeNull();
    expect(await db.llmCache.findUnique({ where: { id: general.id } })).not.toBeNull();
    expect(await db.occupation.count()).toBe(1);
  });

  it("deleting a job target removes its requirements, JD plan and JD progress but keeps occupation plan and progress", async () => {
    const g = await populatedGuest();
    await db.jobTarget.delete({ where: { id: g.jt.id } });
    expect(await db.jobRequirement.count({ where: { profileId: g.p.id } })).toBe(0);
    expect(await db.plan.findMany({ where: { profileId: g.p.id }, select: { targetKind: true } })).toEqual([{ targetKind: "occupation" }]);
    expect(await db.planItemProgress.findMany({ where: { profileId: g.p.id }, select: { targetKey: true } })).toEqual([{ targetKey: "occupation:onet:11-1111.00" }]);
  });

  it("deleting an occupation cascades its reference milestone templates", async () => {
    await db.occupation.create({ data: { code: "onet:99-9999.00", title: "Temp", description: "t", majorGroup: "99", minorGroup: "99-9", sourceVersion: "t1" } });
    await db.milestoneTemplate.create({ data: { id: "m1", occupationCode: "onet:99-9999.00", title: "Project", description: "d", version: "v1" } });
    await expect(db.milestoneTemplate.create({ data: { id: "m2", occupationCode: "onet:missing", title: "x", description: "d", version: "v1" } }))
      .rejects.toThrow(/MilestoneTemplate_occupationCode_fkey/);
    await db.occupation.delete({ where: { code: "onet:99-9999.00" } });
    expect(await db.milestoneTemplate.count({ where: { id: "m1" } })).toBe(0);
  });

  it("deleting reference data in use is restricted rather than silently cascading into requirements", async () => {
    await db.onetElement.create({ data: { id: "onet-element:test", kind: "skill", name: "Test", sourceVersion: "t1" } });
    await db.occupationRequirement.create({
      data: { occupationCode: "onet:11-1111.00", kind: "descriptor", elementId: "onet-element:test", sourceRecordId: "r1", sourceVersion: "t1" },
    });
    await expect(db.onetElement.delete({ where: { id: "onet-element:test" } })).rejects.toThrow(/OccupationRequirement_elementId_fkey/);
  });
});

describe("owner-scope constraints", () => {
  it("a plan cannot point at another profile's job target", async () => {
    const a = await populatedGuest();
    const b = await populatedGuest();
    await expect(db.plan.create({
      data: { profileId: b.p.id, targetKind: "job", jobTargetId: a.jt.id, inputHash: "x", catalogVersion: "t1", totalHours: 1, payload: {} },
    })).rejects.toThrow(/Plan_jobTargetId_profileId_fkey/);
  });

  it("a job requirement cannot be attached to another profile's job target", async () => {
    const a = await populatedGuest();
    const b = await populatedGuest();
    await expect(db.jobRequirement.create({
      data: { jobTargetId: a.jt.id, profileId: b.p.id, rawText: "x", quoteStart: 0, quoteEnd: 1, required: true, level: 0.5, levelAssumed: true },
    })).rejects.toThrow(/JobRequirement_jobTargetId_profileId_fkey/);
  });

  it("an analysis run cannot reference a profile owned by another session", async () => {
    const a = await populatedGuest();
    const b = await populatedGuest();
    await expect(db.analysisRun.create({
      data: { sessionId: b.s.id, profileId: a.p.id, idempotencyKey: "steal", stage: "reading", expiresAt: new Date(Date.now() + DAY) },
    })).rejects.toThrow(/AnalysisRun_profileId_sessionId_fkey/);
  });

  it("a repeated idempotency key in one session is a unique-constraint conflict", async () => {
    const a = await populatedGuest();
    await expect(db.analysisRun.create({
      data: { sessionId: a.s.id, idempotencyKey: "k1", stage: "reading", expiresAt: new Date(Date.now() + DAY) },
    })).rejects.toThrow(/AnalysisRun_sessionId_idempotencyKey_key/);
  });

  it("job-target progress cannot name another profile's JD, and its key must match its jobTargetId", async () => {
    const a = await populatedGuest();
    const b = await populatedGuest();
    await expect(db.planItemProgress.create({ data: { profileId: b.p.id, jobTargetId: a.jt.id, targetKey: `job:${a.jt.id}`, itemKey: "x", status: "done" } }))
      .rejects.toThrow(/PlanItemProgress_jobTargetId_profileId_fkey/);
    await expect(db.planItemProgress.create({ data: { profileId: b.p.id, targetKey: `job:${b.jt.id}`, itemKey: "x", status: "done" } }))
      .rejects.toThrow(/PlanItemProgress_target_check/);
    await expect(db.planItemProgress.create({ data: { profileId: b.p.id, jobTargetId: b.jt.id, targetKey: `job:${a.jt.id}`, itemKey: "x", status: "done" } }))
      .rejects.toThrow(/PlanItemProgress_target_check/);
    await expect(db.planItemProgress.create({ data: { profileId: b.p.id, jobTargetId: b.jt.id, targetKey: "occupation:onet:11-1111.00", itemKey: "x", status: "done" } }))
      .rejects.toThrow(/PlanItemProgress_target_check/);
  });

  it("model-cache keys are scoped per owner: the same key for two profiles is two rows, never one shared row", async () => {
    const a = await populatedGuest();
    const b = await populatedGuest();
    const base = { key: "explain:onet:11-1111.00:v1", scope: "personal", task: "explain", model: "m", promptVersion: "v1", expiresAt: new Date(Date.now() + DAY) };
    await db.llmCache.create({ data: { ...base, profileId: a.p.id, payload: { owner: "a" } } });
    await db.llmCache.create({ data: { ...base, profileId: b.p.id, payload: { owner: "b" } } });
    const forB = await db.llmCache.findUniqueOrThrow({ where: { profileId_key: { profileId: b.p.id, key: base.key } } });
    expect(forB.payload).toEqual({ owner: "b" });
    await expect(db.llmCache.create({ data: { ...base, profileId: a.p.id, payload: {} } }))
      .rejects.toThrow(/LlmCache_profileId_key_key/);
    const general = { key: "outlook:onet:11-1111.00", scope: "general", task: "outlook", model: "m", promptVersion: "v1", payload: {}, expiresAt: new Date(Date.now() + DAY) };
    await db.llmCache.create({ data: general });
    await expect(db.llmCache.create({ data: general })).rejects.toThrow(/LlmCache_general_key_partial_idx/);
  });

  it("enforces text length limits for minimized CV text (50,000) and pasted job text (12,000)", async () => {
    const a = await populatedGuest();
    await db.cvText.update({ where: { profileId: a.p.id }, data: { text: "é".repeat(50_000) } }); // code points, not bytes
    await expect(db.cvText.update({ where: { profileId: a.p.id }, data: { text: "x".repeat(50_001) } })).rejects.toThrow(/CvText_text_length_check/);
    await db.jobTarget.update({ where: { id: a.jt.id }, data: { redactedText: "x".repeat(12_000) } });
    await expect(db.jobTarget.update({ where: { id: a.jt.id }, data: { redactedText: "x".repeat(12_001) } })).rejects.toThrow(/JobTarget_redactedText_length_check/);
  });

  it("enforces the remaining CHECKs: requirement kind, quote offsets, levels, revision and resource hours", async () => {
    const a = await populatedGuest();
    await db.onetElement.create({ data: { id: "onet-element:chk", kind: "skill", name: "Chk", sourceVersion: "t1" } });
    await expect(db.occupationRequirement.create({ data: { occupationCode: "onet:11-1111.00", kind: "software", elementId: "onet-element:chk", sourceRecordId: "c1", sourceVersion: "t1" } }))
      .rejects.toThrow(/OccupationRequirement_kind_check/);
    await expect(db.occupationRequirement.create({ data: { occupationCode: "onet:11-1111.00", kind: "descriptor", sourceRecordId: "c2", sourceVersion: "t1" } }))
      .rejects.toThrow(/OccupationRequirement_kind_check/);
    await expect(db.profileExperience.create({ data: { profileId: a.p.id, title: "x", mappingCandidates: [], provenance: "extracted", quoteStart: 5 } }))
      .rejects.toThrow(/ProfileExperience_quote_check/);
    await expect(db.profileExperience.create({ data: { profileId: a.p.id, title: "x", mappingCandidates: [], provenance: "extracted", quoteStart: 5, quoteEnd: 5 } }))
      .rejects.toThrow(/ProfileExperience_quote_check/);
    await expect(db.profileExperience.create({ data: { profileId: a.p.id, title: "x", mappingCandidates: [], provenance: "occupation-inferred" } }))
      .rejects.toThrow(/ProfileExperience_provenance_check/);
    await expect(db.profileEducation.create({ data: { profileId: a.p.id, label: "x", provenance: "extracted", quoteStart: -1, quoteEnd: 2 } }))
      .rejects.toThrow(/ProfileEducation_quote_check/);
    await expect(db.profileEducation.create({ data: { profileId: a.p.id, label: "x", provenance: "guessed" } }))
      .rejects.toThrow(/ProfileEducation_provenance_check/);
    await expect(db.jobRequirement.create({ data: { jobTargetId: a.jt.id, profileId: a.p.id, rawText: "x", quoteStart: 4, quoteEnd: 2, required: true, level: 0.5, levelAssumed: true } }))
      .rejects.toThrow(/JobRequirement_quote_check/);
    await expect(db.jobRequirement.create({ data: { jobTargetId: a.jt.id, profileId: a.p.id, rawText: "x", quoteStart: 0, quoteEnd: 2, required: true, level: 1.5, levelAssumed: false } }))
      .rejects.toThrow(/JobRequirement_level_check/);
    await expect(db.profile.update({ where: { id: a.p.id }, data: { revision: -1 } })).rejects.toThrow(/Profile_revision_check/);
    await expect(db.learningResource.create({
      data: { id: "r0", provider: "p", url: "https://example.org/c", title: "t", language: "en", hours: 0, hoursSupplied: true, accessNote: "free", linkStatus: "unchecked", catalogVersion: "t1" },
    })).rejects.toThrow(/LearningResource_hours_check/);
  });

  it("a profile is either session-owned or a demo, never both or neither", async () => {
    const s = await session();
    await expect(db.profile.create({ data: { sessionId: s.id, demoKey: "persona-x", country: "GB", preferences: {} } })).rejects.toThrow(/Profile_owner_xor_demo_check/);
    await expect(db.profile.create({ data: { country: "GB", preferences: {} } })).rejects.toThrow(/Profile_owner_xor_demo_check/);
  });

  it("personal model-cache rows require an owning profile; general rows may not carry one", async () => {
    const a = await populatedGuest();
    const base = { task: "t", model: "m", promptVersion: "v1", payload: {}, expiresAt: new Date(Date.now() + DAY) };
    await expect(db.llmCache.create({ data: { ...base, key: "p-noowner", scope: "personal" } })).rejects.toThrow(/LlmCache_scope_check/);
    await expect(db.llmCache.create({ data: { ...base, key: "g-owner", scope: "general", profileId: a.p.id } })).rejects.toThrow(/LlmCache_scope_check/);
  });

  it("plan targets are discriminated", async () => {
    const a = await populatedGuest();
    const base = { profileId: a.p.id, catalogVersion: "t1", totalHours: 1, payload: {} };
    await expect(db.plan.create({ data: { ...base, targetKind: "occupation", inputHash: "n1" } })).rejects.toThrow(/Plan_target_check/);
    await expect(db.plan.create({ data: { ...base, targetKind: "occupation", occupationCode: "onet:11-1111.00", jobTargetId: a.jt.id, inputHash: "n2" } })).rejects.toThrow(/Plan_target_check/);
    await expect(db.plan.create({ data: { ...base, targetKind: "job", inputHash: "n3" } })).rejects.toThrow(/Plan_target_check/);
  });

  it("enforces value ranges: weekly hours 1–40, provenance vocabulary, normalized components", async () => {
    const s = await session();
    await expect(db.profile.create({ data: { sessionId: s.id, country: "BD", weeklyHours: 0, preferences: {} } })).rejects.toThrow(/Profile_weeklyHours_check/);
    await expect(db.profile.create({ data: { sessionId: s.id, country: "BD", weeklyHours: 41, preferences: {} } })).rejects.toThrow(/Profile_weeklyHours_check/);
    const a = await populatedGuest();
    await expect(db.profileSkill.create({
      data: { profileId: a.p.id, kind: "software", rawName: "x", provenance: "model-guess", evidence: [], mappingCandidates: [] },
    })).rejects.toThrow(/ProfileSkill_provenance_check/);
    const run = await db.matchRun.findFirstOrThrow({ where: { profileId: a.p.id } });
    await expect(db.match.create({
      data: { matchRunId: run.id, occupationCode: "onet:other", rank: 2, opportunity: 50, fit: 1.2, reach: 0.5, demand: 0.5, breakdown: {} },
    })).rejects.toThrow(/Match_components_check/);
  });
});
