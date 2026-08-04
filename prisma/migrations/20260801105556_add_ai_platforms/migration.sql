-- CreateTable
CREATE TABLE "AiPlatform" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiPlatform_userId_idx" ON "AiPlatform"("userId");

-- CreateIndex
CREATE INDEX "AiPlatform_userId_provider_idx" ON "AiPlatform"("userId", "provider");

-- AddForeignKey
ALTER TABLE "AiPlatform" ADD CONSTRAINT "AiPlatform_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
