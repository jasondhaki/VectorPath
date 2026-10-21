-- U03 review fixes (docs/agents/reviews/U03.md #2, #5, #6, #7, #9). Generated with `prisma migrate diff`;
-- Prisma's proposed DROP INDEX lines for the hand-written *_hnsw_idx indexes were removed (it cannot model them).

-- DropIndex: LlmCache keys become unique per owner instead of globally (#6).
DROP INDEX "LlmCache_key_key";

-- AlterTable: per-row embedding identity (#2, I13).
ALTER TABLE "Occupation" ADD COLUMN     "embeddingIdentity" TEXT;
ALTER TABLE "OccupationTitle" ADD COLUMN     "embeddingIdentity" TEXT;
ALTER TABLE "Skill" ADD COLUMN     "embeddingIdentity" TEXT;

-- AlterTable: job-target progress is owned by its JD (#5).
ALTER TABLE "PlanItemProgress" ADD COLUMN     "jobTargetId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "LlmCache_profileId_key_key" ON "LlmCache"("profileId", "key");

-- AddForeignKey (#7: reference → reference)
ALTER TABLE "MilestoneTemplate" ADD CONSTRAINT "MilestoneTemplate_occupationCode_fkey" FOREIGN KEY ("occupationCode") REFERENCES "Occupation"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (#5: composite owner FK)
ALTER TABLE "PlanItemProgress" ADD CONSTRAINT "PlanItemProgress_jobTargetId_profileId_fkey" FOREIGN KEY ("jobTargetId", "profileId") REFERENCES "JobTarget"("id", "profileId") ON DELETE CASCADE ON UPDATE CASCADE;

-- ───── Hand-written constraints ─────

-- Each vector column holds exactly one pinned identity (architecture §12.3): set iff a vector is present.
-- Must equal REFERENCE_EMBEDDING_IDENTITY in lib/db/vector.ts. local-hash-ngram-v1 never enters these columns.
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_embeddingIdentity_check" CHECK (
  (("embedding" IS NULL) = ("embeddingIdentity" IS NULL))
  AND ("embeddingIdentity" IS NULL OR "embeddingIdentity" = 'gemini-embedding-001:768:SEMANTIC_SIMILARITY:l2'));
ALTER TABLE "Occupation" ADD CONSTRAINT "Occupation_embeddingIdentity_check" CHECK (
  (("embedding" IS NULL) = ("embeddingIdentity" IS NULL))
  AND ("embeddingIdentity" IS NULL OR "embeddingIdentity" = 'gemini-embedding-001:768:SEMANTIC_SIMILARITY:l2'));
ALTER TABLE "OccupationTitle" ADD CONSTRAINT "OccupationTitle_embeddingIdentity_check" CHECK (
  (("embedding" IS NULL) = ("embeddingIdentity" IS NULL))
  AND ("embeddingIdentity" IS NULL OR "embeddingIdentity" = 'gemini-embedding-001:768:SEMANTIC_SIMILARITY:l2'));

-- General (unowned) model-cache keys stay globally unique; NULL profileId escapes the composite unique (#6).
CREATE UNIQUE INDEX "LlmCache_general_key_partial_idx" ON "LlmCache"("key") WHERE "profileId" IS NULL;

-- Progress target discriminant: job:<id> rows carry the matching jobTargetId; occupation rows carry none (#5).
ALTER TABLE "PlanItemProgress" ADD CONSTRAINT "PlanItemProgress_target_check" CHECK (
  ("jobTargetId" IS NULL AND "targetKey" LIKE 'occupation:%')
  OR ("jobTargetId" IS NOT NULL AND "targetKey" = 'job:' || "jobTargetId"::text));

-- Defense-in-depth text limits (architecture §6.2; TEXT_LIMITS in lib/domain/redaction/limits.ts, code points).
ALTER TABLE "CvText" ADD CONSTRAINT "CvText_text_length_check" CHECK (char_length("text") <= 50000);
ALTER TABLE "JobTarget" ADD CONSTRAINT "JobTarget_redactedText_length_check" CHECK (char_length("redactedText") <= 12000);
