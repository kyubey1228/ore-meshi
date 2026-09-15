CREATE TABLE "MatchChatMessage" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MatchChatMessage_matchId_senderId_clientMessageId_key" ON "MatchChatMessage"("matchId", "senderId", "clientMessageId");
CREATE INDEX "MatchChatMessage_matchId_createdAt_id_idx" ON "MatchChatMessage"("matchId", "createdAt", "id");
ALTER TABLE "MatchChatMessage" ADD CONSTRAINT "MatchChatMessage_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchChatMessage" ADD CONSTRAINT "MatchChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
