-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN     "imapHost" TEXT,
ADD COLUMN     "imapPass" TEXT,
ADD COLUMN     "imapPort" INTEGER,
ADD COLUMN     "imapSecure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "imapUser" TEXT,
ADD COLUMN     "lastReplySyncAt" TIMESTAMP(3),
ADD COLUMN     "replySyncEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "interviewAt" TIMESTAMP(3),
ADD COLUMN     "interviewRemindedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobPreferences" ADD COLUMN     "inAppAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "interviewRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastCrawlError" TEXT,
ADD COLUMN     "lastCrawlFailedAt" TIMESTAMP(3),
ADD COLUMN     "slackWebhookUrl" TEXT;

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppNotification_userId_createdAt_idx" ON "AppNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AppNotification_userId_readAt_idx" ON "AppNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "JobApplication_userId_interviewAt_idx" ON "JobApplication"("userId", "interviewAt");

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
