CREATE TABLE "MobileAuthorizationCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileAuthorizationCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MobileSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileAuthorizationCode_codeHash_key" ON "MobileAuthorizationCode"("codeHash");
CREATE INDEX "MobileAuthorizationCode_userId_createdAt_idx" ON "MobileAuthorizationCode"("userId", "createdAt");
CREATE INDEX "MobileAuthorizationCode_expiresAt_idx" ON "MobileAuthorizationCode"("expiresAt");
CREATE UNIQUE INDEX "MobileSession_tokenHash_key" ON "MobileSession"("tokenHash");
CREATE INDEX "MobileSession_userId_createdAt_idx" ON "MobileSession"("userId", "createdAt");
CREATE INDEX "MobileSession_expiresAt_idx" ON "MobileSession"("expiresAt");
ALTER TABLE "MobileAuthorizationCode" ADD CONSTRAINT "MobileAuthorizationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileSession" ADD CONSTRAINT "MobileSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
