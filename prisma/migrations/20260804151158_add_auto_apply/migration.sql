-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "applyPackageJson" JSONB,
ADD COLUMN     "autoApplyError" TEXT,
ADD COLUMN     "autoApplyStatus" TEXT,
ADD COLUMN     "autoPreparedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobPreferences" ADD COLUMN     "autoApplyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoApplyFollowUpDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "autoApplyMarkApplied" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoApplyMinScore" INTEGER NOT NULL DEFAULT 70;
