-- Apply before deploying the accompanying application code. Additive; no existing rows removed.
ALTER TABLE "FreemiumScan" ADD COLUMN IF NOT EXISTS "analysisSnapshot" JSONB;
ALTER TABLE "FreemiumScan" ADD COLUMN IF NOT EXISTS "queryEvidence" JSONB;
ALTER TABLE "AuditJob" ADD COLUMN IF NOT EXISTS "analysisSnapshot" JSONB;
ALTER TABLE "AuditJob" ADD COLUMN IF NOT EXISTS "generatedQueries" JSONB;
CREATE TABLE IF NOT EXISTS "ServiceInquiry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ServiceInquiry_kind_createdAt_idx" ON "ServiceInquiry"("kind", "createdAt");

-- Forms contain personal data; only the server database role may access this table.
ALTER TABLE "ServiceInquiry" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "displayName" TEXT;

ALTER TABLE "AuditJob" ADD COLUMN IF NOT EXISTS "executionDiagnostics" JSONB;

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "websiteFix" JSONB;
