import { task, wait } from "@trigger.dev/sdk/v3"
import { Resend } from "resend"
import { prisma } from "../lib/prisma"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}

const FROM = () => process.env.FROM_EMAIL ?? "noreply@kaligeo.com"
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://kaligeo.ru"

export interface ColdSequencePayload {
  leadId: string
  campaignId: string
}

interface SequenceStep {
  subject: string
  bodyTemplate: string
  delayHours: number
}

export const coldSequence = task({
  id: "send-cold-sequence",
  maxDuration: 700_000,
  retry: { maxAttempts: 1 },

  run: async ({ leadId, campaignId }: ColdSequencePayload) => {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })

    if (!lead || !campaign) return
    if (lead.status === "UNSUBSCRIBED") return

    const toEmail = lead.enrichedEmail ?? lead.email
    if (!toEmail) {
      console.warn(`[cold-sequence] No email for lead ${leadId}`)
      return
    }

    const steps = campaign.sequences as unknown as SequenceStep[]
    const auditUrl = `${APP_URL()}/chat?url=${lead.websiteUrl ? encodeURIComponent(lead.websiteUrl) : ""}`

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      if (i > 0) {
        await wait.for({ hours: step.delayHours })
        // Re-check lead status after wait
        const freshLead = await prisma.lead.findUnique({ where: { id: leadId } })
        if (!freshLead || freshLead.status === "UNSUBSCRIBED" || freshLead.status === "CONVERTED") return
      }

      const body = personalizeTemplate(step.bodyTemplate, {
        companyName: lead.companyName,
        niche: lead.niche ?? "вашей нише",
        city: lead.city ?? "вашем городе",
        auditUrl,
      })

      const subject = personalizeTemplate(step.subject, {
        companyName: lead.companyName,
        niche: lead.niche ?? "вашей нише",
        city: lead.city ?? "вашем городе",
        auditUrl,
      })

      try {
        const result = await getResend().emails.send({
          from: FROM(),
          to: toEmail,
          subject,
          html: coldEmailWrapper(body),
        })

        await prisma.outreachEmail.create({
          data: {
            leadId,
            campaignId,
            subject,
            body,
            messageId: result.data?.id,
            sentAt: new Date(),
          },
        })

        await prisma.lead.update({
          where: { id: leadId },
          data: { status: "CONTACTED" },
        })
      } catch (err) {
        console.error(`[cold-sequence] Send error for lead ${leadId}, step ${i}:`, err)
      }
    }
  },
})

function personalizeTemplate(
  template: string,
  vars: { companyName: string; niche: string; city: string; auditUrl: string }
): string {
  return template
    .replace(/\{companyName\}/g, vars.companyName)
    .replace(/\{niche\}/g, vars.niche)
    .replace(/\{city\}/g, vars.city)
    .replace(/\{auditUrl\}/g, vars.auditUrl)
}

function coldEmailWrapper(body: string) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#1a1a1a;font-size:15px;line-height:1.6;">
${body}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
<p style="color:#9ca3af;font-size:11px;">
  KaliGEO · AI Search Visibility · <a href="https://kaligeo.ru" style="color:#9ca3af;">kaligeo.ru</a><br>
  Чтобы отписаться — ответьте с темой "Отписаться"
</p>
</body></html>`
}
