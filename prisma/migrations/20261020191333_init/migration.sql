-- Extensions (architecture §12.4): created in migration SQL, not the deprecated preview feature.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "PlanTargetKind" AS ENUM ('occupation', 'job');

-- CreateTable
CREATE TABLE "SourceManifest" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "useDecision" TEXT NOT NULL,
    "checksums" JSONB NOT NULL,
    "counts" JSONB NOT NULL,
    "periods" JSONB,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" UUID NOT NULL,
    "manifestId" UUID,
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checkpoint" JSONB,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occupation" (
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "majorGroup" TEXT NOT NULL,
    "minorGroup" TEXT NOT NULL,
    "zone" INTEGER,
    "zoneScale" TEXT,
    "sector" TEXT,
    "green" BOOLEAN NOT NULL DEFAULT false,
    "sourceVersion" TEXT NOT NULL,
    "embedding" vector(768),

    CONSTRAINT "Occupation_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "OccupationTitle" (
    "id" UUID NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "embedding" vector(768),

    CONSTRAINT "OccupationTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnetElement" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceVersion" TEXT NOT NULL,

    CONSTRAINT "OnetElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccupationRequirement" (
    "id" UUID NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "elementId" TEXT,
    "skillId" TEXT,
    "rawImportance" DOUBLE PRECISION,
    "rawLevel" DOUBLE PRECISION,
    "importanceScale" TEXT,
    "levelScale" TEXT,
    "normalizedWeight" DOUBLE PRECISION,
    "requiredLevel" DOUBLE PRECISION,
    "suppressed" BOOLEAN NOT NULL DEFAULT false,
    "notRelevant" BOOLEAN NOT NULL DEFAULT false,
    "hot" BOOLEAN NOT NULL DEFAULT false,
    "inDemand" BOOLEAN NOT NULL DEFAULT false,
    "sourceRecordId" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,

    CONSTRAINT "OccupationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "embedding" vector(768),

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillAlias" (
    "id" UUID NOT NULL,
    "skillId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,

    CONSTRAINT "SkillAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillNeighbor" (
    "skillId" TEXT NOT NULL,
    "neighborId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "dataVersion" TEXT NOT NULL,

    CONSTRAINT "SkillNeighbor_pkey" PRIMARY KEY ("skillId","neighborId","dataVersion")
);

-- CreateTable
CREATE TABLE "OccupationProfile" (
    "id" UUID NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,

    CONSTRAINT "OccupationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccupationEdge" (
    "id" UUID NOT NULL,
    "fromCode" TEXT NOT NULL,
    "toCode" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tier" TEXT,
    "similarity" DOUBLE PRECISION,
    "graphVersion" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,
    "workload" JSONB NOT NULL,

    CONSTRAINT "OccupationEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccupationTask" (
    "id" UUID NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,

    CONSTRAINT "OccupationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccupationalFact" (
    "id" UUID NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "observedPeriod" TEXT,

    CONSTRAINT "OccupationalFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketStat" (
    "id" UUID NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "endpoint" TEXT NOT NULL,
    "count" INTEGER,
    "meanSalary" DOUBLE PRECISION,
    "currency" TEXT,
    "mode" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "observedAt" TIMESTAMPTZ(3) NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MarketStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MacroIndicator" (
    "id" UUID NOT NULL,
    "country" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "vintage" TEXT NOT NULL,
    "isProjection" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MacroIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorSignal" (
    "id" UUID NOT NULL,
    "country" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "supportFacts" JSONB NOT NULL,
    "computedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SectorSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningResource" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT,
    "language" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "hoursSupplied" BOOLEAN NOT NULL,
    "accessNote" TEXT NOT NULL,
    "paidCertificate" BOOLEAN NOT NULL DEFAULT false,
    "freeAccessCheckedAt" TIMESTAMPTZ(3),
    "linkStatus" TEXT NOT NULL,
    "linkCheckedAt" TIMESTAMPTZ(3),
    "catalogVersion" TEXT NOT NULL,

    CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceSkill" (
    "resourceId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ResourceSkill_pkey" PRIMARY KEY ("resourceId","skillId")
);

-- CreateTable
CREATE TABLE "SkillPrereq" (
    "id" UUID NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "catalogVersion" TEXT NOT NULL,

    CONSTRAINT "SkillPrereq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneTemplate" (
    "id" TEXT NOT NULL,
    "occupationCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "MilestoneTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoScenario" (
    "id" UUID NOT NULL,
    "personaId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "preferenceHash" TEXT NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "artifacts" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "consentVersion" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "sessionId" UUID,
    "demoKey" TEXT,
    "country" TEXT NOT NULL,
    "weeklyHours" INTEGER NOT NULL DEFAULT 8,
    "preferences" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvText" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CvText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileExperience" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "employer" TEXT,
    "years" DOUBLE PRECISION,
    "occupationCode" TEXT,
    "mappingCandidates" JSONB NOT NULL,
    "provenance" TEXT NOT NULL,
    "quoteStart" INTEGER,
    "quoteEnd" INTEGER,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileEducation" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "quoteStart" INTEGER,
    "quoteEnd" INTEGER,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSkill" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "canonicalId" TEXT,
    "rawName" TEXT NOT NULL,
    "level" DOUBLE PRECISION,
    "overrideLevel" DOUBLE PRECISION,
    "provenance" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "mappingCandidates" JSONB NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchRun" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "profileRevision" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" UUID NOT NULL,
    "matchRunId" UUID NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "held" BOOLEAN NOT NULL DEFAULT false,
    "opportunity" DOUBLE PRECISION NOT NULL,
    "fit" DOUBLE PRECISION NOT NULL,
    "reach" DOUBLE PRECISION NOT NULL,
    "demand" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "targetKind" "PlanTargetKind" NOT NULL,
    "occupationCode" TEXT,
    "jobTargetId" UUID,
    "inputHash" TEXT NOT NULL,
    "catalogVersion" TEXT NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanItemProgress" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "targetKey" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlanItemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathRun" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "profileRevision" INTEGER NOT NULL,
    "graphVersion" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "lens" TEXT NOT NULL,
    "constraints" JSONB NOT NULL,
    "paths" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTarget" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "redactedText" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequirement" (
    "id" UUID NOT NULL,
    "jobTargetId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "canonicalId" TEXT,
    "rawText" TEXT NOT NULL,
    "quoteStart" INTEGER NOT NULL,
    "quoteEnd" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL,
    "level" DOUBLE PRECISION NOT NULL,
    "levelAssumed" BOOLEAN NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JobRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "profileId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "failureCategory" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCache" (
    "key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "mode" TEXT NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ApiBudget" (
    "provider" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiBudget_pkey" PRIMARY KEY ("provider","window","windowStart")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "LlmCache" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "profileId" UUID,
    "task" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LlmCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmCall" (
    "id" UUID NOT NULL,
    "task" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "fallbackReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceManifest_source_version_key" ON "SourceManifest"("source", "version");

-- CreateIndex
CREATE INDEX "IngestionRun_command_startedAt_idx" ON "IngestionRun"("command", "startedAt");

-- CreateIndex
CREATE INDEX "Occupation_minorGroup_idx" ON "Occupation"("minorGroup");

-- CreateIndex
CREATE UNIQUE INDEX "OccupationTitle_occupationCode_normalized_key" ON "OccupationTitle"("occupationCode", "normalized");

-- CreateIndex
CREATE INDEX "OccupationRequirement_elementId_idx" ON "OccupationRequirement"("elementId");

-- CreateIndex
CREATE INDEX "OccupationRequirement_skillId_idx" ON "OccupationRequirement"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "OccupationRequirement_occupationCode_sourceRecordId_sourceV_key" ON "OccupationRequirement"("occupationCode", "sourceRecordId", "sourceVersion");

-- CreateIndex
CREATE UNIQUE INDEX "SkillAlias_normalized_skillId_key" ON "SkillAlias"("normalized", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "OccupationProfile_occupationCode_dataVersion_key" ON "OccupationProfile"("occupationCode", "dataVersion");

-- CreateIndex
CREATE INDEX "OccupationEdge_graphVersion_fromCode_idx" ON "OccupationEdge"("graphVersion", "fromCode");

-- CreateIndex
CREATE UNIQUE INDEX "OccupationEdge_fromCode_toCode_kind_graphVersion_key" ON "OccupationEdge"("fromCode", "toCode", "kind", "graphVersion");

-- CreateIndex
CREATE UNIQUE INDEX "OccupationTask_occupationCode_taskId_sourceVersion_key" ON "OccupationTask"("occupationCode", "taskId", "sourceVersion");

-- CreateIndex
CREATE UNIQUE INDEX "OccupationalFact_occupationCode_kind_sourceVersion_key" ON "OccupationalFact"("occupationCode", "kind", "sourceVersion");

-- CreateIndex
CREATE INDEX "MarketStat_country_dataVersion_idx" ON "MarketStat"("country", "dataVersion");

-- CreateIndex
CREATE UNIQUE INDEX "MarketStat_occupationCode_country_query_dataVersion_key" ON "MarketStat"("occupationCode", "country", "query", "dataVersion");

-- CreateIndex
CREATE UNIQUE INDEX "MacroIndicator_country_indicator_year_vintage_key" ON "MacroIndicator"("country", "indicator", "year", "vintage");

-- CreateIndex
CREATE UNIQUE INDEX "SectorSignal_country_sector_dataVersion_key" ON "SectorSignal"("country", "sector", "dataVersion");

-- CreateIndex
CREATE UNIQUE INDEX "SkillPrereq_fromId_toId_catalogVersion_key" ON "SkillPrereq"("fromId", "toId", "catalogVersion");

-- CreateIndex
CREATE UNIQUE INDEX "DemoScenario_personaId_country_preferenceHash_dataVersion_s_key" ON "DemoScenario"("personaId", "country", "preferenceHash", "dataVersion", "scoringVersion", "promptVersion");

-- CreateIndex
CREATE UNIQUE INDEX "GuestSession_tokenHash_key" ON "GuestSession"("tokenHash");

-- CreateIndex
CREATE INDEX "GuestSession_expiresAt_idx" ON "GuestSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_demoKey_key" ON "Profile"("demoKey");

-- CreateIndex
CREATE INDEX "Profile_sessionId_idx" ON "Profile"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_id_sessionId_key" ON "Profile"("id", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CvText_profileId_key" ON "CvText"("profileId");

-- CreateIndex
CREATE INDEX "ProfileExperience_profileId_idx" ON "ProfileExperience"("profileId");

-- CreateIndex
CREATE INDEX "ProfileEducation_profileId_idx" ON "ProfileEducation"("profileId");

-- CreateIndex
CREATE INDEX "ProfileSkill_profileId_idx" ON "ProfileSkill"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRun_profileId_inputHash_key" ON "MatchRun"("profileId", "inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "Match_matchRunId_occupationCode_key" ON "Match"("matchRunId", "occupationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_profileId_inputHash_key" ON "Plan"("profileId", "inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "PlanItemProgress_profileId_targetKey_itemKey_key" ON "PlanItemProgress"("profileId", "targetKey", "itemKey");

-- CreateIndex
CREATE INDEX "PathRun_profileId_idx" ON "PathRun"("profileId");

-- CreateIndex
CREATE INDEX "JobTarget_profileId_idx" ON "JobTarget"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "JobTarget_id_profileId_key" ON "JobTarget"("id", "profileId");

-- CreateIndex
CREATE INDEX "JobRequirement_jobTargetId_idx" ON "JobRequirement"("jobTargetId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisRun_sessionId_idempotencyKey_key" ON "AnalysisRun"("sessionId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LlmCache_key_key" ON "LlmCache"("key");

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "SourceManifest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationTitle" ADD CONSTRAINT "OccupationTitle_occupationCode_fkey" FOREIGN KEY ("occupationCode") REFERENCES "Occupation"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationRequirement" ADD CONSTRAINT "OccupationRequirement_occupationCode_fkey" FOREIGN KEY ("occupationCode") REFERENCES "Occupation"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationRequirement" ADD CONSTRAINT "OccupationRequirement_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "OnetElement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationRequirement" ADD CONSTRAINT "OccupationRequirement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillAlias" ADD CONSTRAINT "SkillAlias_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillNeighbor" ADD CONSTRAINT "SkillNeighbor_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillNeighbor" ADD CONSTRAINT "SkillNeighbor_neighborId_fkey" FOREIGN KEY ("neighborId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationProfile" ADD CONSTRAINT "OccupationProfile_occupationCode_fkey" FOREIGN KEY ("occupationCode") REFERENCES "Occupation"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationEdge" ADD CONSTRAINT "OccupationEdge_fromCode_fkey" FOREIGN KEY ("fromCode") REFERENCES "Occupation"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationEdge" ADD CONSTRAINT "OccupationEdge_toCode_fkey" FOREIGN KEY ("toCode") REFERENCES "Occupation"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationTask" ADD CONSTRAINT "OccupationTask_occupationCode_fkey" FOREIGN KEY ("occupationCode") REFERENCES "Occupation"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationalFact" ADD CONSTRAINT "OccupationalFact_occupationCode_fkey" FOREIGN KEY ("occupationCode") REFERENCES "Occupation"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketStat" ADD CONSTRAINT "MarketStat_occupationCode_fkey" FOREIGN KEY ("occupationCode") REFERENCES "Occupation"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSkill" ADD CONSTRAINT "ResourceSkill_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSkill" ADD CONSTRAINT "ResourceSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvText" ADD CONSTRAINT "CvText_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileExperience" ADD CONSTRAINT "ProfileExperience_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileEducation" ADD CONSTRAINT "ProfileEducation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSkill" ADD CONSTRAINT "ProfileSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRun" ADD CONSTRAINT "MatchRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_matchRunId_fkey" FOREIGN KEY ("matchRunId") REFERENCES "MatchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_jobTargetId_profileId_fkey" FOREIGN KEY ("jobTargetId", "profileId") REFERENCES "JobTarget"("id", "profileId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemProgress" ADD CONSTRAINT "PlanItemProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathRun" ADD CONSTRAINT "PathRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTarget" ADD CONSTRAINT "JobTarget_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_jobTargetId_profileId_fkey" FOREIGN KEY ("jobTargetId", "profileId") REFERENCES "JobTarget"("id", "profileId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_profileId_sessionId_fkey" FOREIGN KEY ("profileId", "sessionId") REFERENCES "Profile"("id", "sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmCache" ADD CONSTRAINT "LlmCache_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ───── Hand-written constraints (not expressible in the Prisma schema) ─────

-- Vector nearest-neighbour indexes: cosine distance over L2-normalized 768-d reference vectors (I13).
CREATE INDEX "Skill_embedding_hnsw_idx" ON "Skill" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "Occupation_embedding_hnsw_idx" ON "Occupation" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "OccupationTitle_embedding_hnsw_idx" ON "OccupationTitle" USING hnsw ("embedding" vector_cosine_ops);

-- Trigram candidate lookup for typo-tolerant alias/title matching (declared in the schema as GIN indexes too).
CREATE INDEX "OccupationTitle_normalized_trgm_idx" ON "OccupationTitle" USING GIN ("normalized" gin_trgm_ops);
CREATE INDEX "SkillAlias_normalized_trgm_idx" ON "SkillAlias" USING GIN ("normalized" gin_trgm_ops);

-- A requirement references exactly the identity its kind names.
ALTER TABLE "OccupationRequirement" ADD CONSTRAINT "OccupationRequirement_kind_check" CHECK (
  ("kind" = 'descriptor' AND "elementId" IS NOT NULL AND "skillId" IS NULL)
  OR ("kind" = 'software' AND "skillId" IS NOT NULL AND "elementId" IS NULL));

-- A profile is either a private guest profile (session-owned) or an immutable public demo, never both or neither.
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_owner_xor_demo_check" CHECK (("sessionId" IS NULL) <> ("demoKey" IS NULL));
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_weeklyHours_check" CHECK ("weeklyHours" BETWEEN 1 AND 40);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_revision_check" CHECK ("revision" >= 0);

-- Discriminated plan target: exactly the field matching targetKind is set.
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_target_check" CHECK (
  ("targetKind" = 'occupation' AND "occupationCode" IS NOT NULL AND "jobTargetId" IS NULL)
  OR ("targetKind" = 'job' AND "jobTargetId" IS NOT NULL AND "occupationCode" IS NULL));
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_totalHours_check" CHECK ("totalHours" >= 0);

-- Personal model-cache rows carry an enforceable owner FK; general rows carry none.
ALTER TABLE "LlmCache" ADD CONSTRAINT "LlmCache_scope_check" CHECK (
  ("scope" = 'personal' AND "profileId" IS NOT NULL) OR ("scope" = 'general' AND "profileId" IS NULL));

-- Evidence provenance and normalized ranges.
ALTER TABLE "ProfileSkill" ADD CONSTRAINT "ProfileSkill_provenance_check" CHECK ("provenance" IN ('extracted', 'occupation-inferred', 'self-reported'));
ALTER TABLE "ProfileSkill" ADD CONSTRAINT "ProfileSkill_kind_check" CHECK ("kind" IN ('software', 'descriptor'));
ALTER TABLE "ProfileSkill" ADD CONSTRAINT "ProfileSkill_level_check" CHECK (("level" IS NULL OR "level" BETWEEN 0 AND 1) AND ("overrideLevel" IS NULL OR "overrideLevel" BETWEEN 0 AND 1));
ALTER TABLE "ProfileExperience" ADD CONSTRAINT "ProfileExperience_provenance_check" CHECK ("provenance" IN ('extracted', 'self-reported'));
ALTER TABLE "ProfileExperience" ADD CONSTRAINT "ProfileExperience_quote_check" CHECK (("quoteStart" IS NULL) = ("quoteEnd" IS NULL) AND ("quoteStart" IS NULL OR (0 <= "quoteStart" AND "quoteStart" < "quoteEnd")));
ALTER TABLE "ProfileEducation" ADD CONSTRAINT "ProfileEducation_provenance_check" CHECK ("provenance" IN ('extracted', 'self-reported'));
ALTER TABLE "ProfileEducation" ADD CONSTRAINT "ProfileEducation_quote_check" CHECK (("quoteStart" IS NULL) = ("quoteEnd" IS NULL) AND ("quoteStart" IS NULL OR (0 <= "quoteStart" AND "quoteStart" < "quoteEnd")));
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_quote_check" CHECK (0 <= "quoteStart" AND "quoteStart" < "quoteEnd");
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_level_check" CHECK ("level" BETWEEN 0 AND 1);
ALTER TABLE "Match" ADD CONSTRAINT "Match_components_check" CHECK (
  "fit" BETWEEN 0 AND 1 AND "reach" BETWEEN 0 AND 1 AND "demand" BETWEEN 0 AND 1 AND "opportunity" BETWEEN 0 AND 100 AND "rank" >= 1);
ALTER TABLE "ApiBudget" ADD CONSTRAINT "ApiBudget_used_check" CHECK ("used" >= 0);
ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_count_check" CHECK ("count" >= 0);
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_hours_check" CHECK ("hours" > 0);
