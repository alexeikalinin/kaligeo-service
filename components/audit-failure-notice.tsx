import { auditFailure } from "@/lib/analysis/audit-failure"
export function AuditFailureNotice({ message }: { message?: string | null }) {
  const failure = auditFailure(message)
  return <div role="status" className="mt-3 space-y-2 text-sm"><p><strong>Этап: {failure.stage}</strong></p><p>{failure.reason}</p><p>{failure.action}</p></div>
}
