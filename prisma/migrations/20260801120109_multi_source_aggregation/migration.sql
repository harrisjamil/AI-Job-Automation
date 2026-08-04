-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "sourceCategory" TEXT NOT NULL DEFAULT 'remote_board',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "JobPreferences" ADD COLUMN     "crawlIntervalHours" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "lastScheduledAt" TIMESTAMP(3),
ADD COLUMN     "scheduledCrawlEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "websiteUrl" TEXT,
    "careersUrl" TEXT,
    "atsType" TEXT,
    "atsSlug" TEXT,
    "category" TEXT NOT NULL DEFAULT 'tech',
    "isRemoteFriendly" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "crawlMethod" TEXT NOT NULL DEFAULT 'api',
    "baseUrl" TEXT,
    "config" JSONB,
    "lastCrawlAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "jobsFound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_atsType_idx" ON "Company"("atsType");

-- CreateIndex
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_atsType_atsSlug_key" ON "Company"("atsType", "atsSlug");

-- CreateIndex
CREATE UNIQUE INDEX "JobSource_key_key" ON "JobSource"("key");

-- CreateIndex
CREATE INDEX "JobSource_category_idx" ON "JobSource"("category");

-- CreateIndex
CREATE INDEX "JobSource_isEnabled_priority_idx" ON "JobSource"("isEnabled", "priority");

-- CreateIndex
CREATE INDEX "Job_userId_fingerprint_idx" ON "Job"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_sourceCategory_idx" ON "Job"("sourceCategory");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
