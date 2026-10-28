-- Additive deployment: existing audits and reports are preserved.
ALTER TABLE "AuditJob" ADD COLUMN IF NOT EXISTS "aiBudgetUsd" DOUBLE PRECISION;
ALTER TABLE "AuditJob" ADD COLUMN IF NOT EXISTS "aiUsage" JSONB;
