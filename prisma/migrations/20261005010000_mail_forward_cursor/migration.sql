CREATE TABLE "MailForwardCursor" (
  "mailbox" TEXT NOT NULL,
  "lastUid" BIGINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MailForwardCursor_pkey" PRIMARY KEY ("mailbox")
);
