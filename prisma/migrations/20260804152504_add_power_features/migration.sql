-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "gapAnalysisJson" JSONB,
ADD COLUMN     "gapAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "interviewPrepAt" TIMESTAMP(3),
ADD COLUMN     "interviewPrepJson" JSONB;

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "lastOutreachFollowUpAt" TIMESTAMP(3),
ADD COLUMN     "lastReplyAt" TIMESTAMP(3),
ADD COLUMN     "outreachFollowUpCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "replyStatus" TEXT NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "ExtensionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Chrome extension',
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtensionToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionToken_tokenHash_key" ON "ExtensionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ExtensionToken_userId_idx" ON "ExtensionToken"("userId");

-- CreateIndex
CREATE INDEX "JobApplication_userId_replyStatus_idx" ON "JobApplication"("userId", "replyStatus");

-- AddForeignKey
ALTER TABLE "ExtensionToken" ADD CONSTRAINT "ExtensionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
