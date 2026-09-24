/**
 * Daily cron that charges due MONITOR_* subscriptions and, on success, spins up the next
 * audit for them. Complements trigger/follow-up-scheduler.ts, which handles the free
 * 30-day re-audit reminder for one-off (non-subscription) clients — that loop explicitly
 * excludes subscriptionId-linked jobs so the two never double-fire on the same audit.
 */
import { schedules, tasks } from "@trigger.dev/sdk/v3"
import { prisma } from "../lib/prisma"
import { auditPipeline } from "./audit-pipeline"
import { chargeBinding, merchantForMarket } from "../lib/billing/alfabank"
import { chargeSavedMethod } from "../lib/billing/yookassa"
import {
  notifySubscriptionCharged,
  notifySubscriptionPastDue,
  notifySubscriptionCanceled,
} from "../lib/notify"

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MAX_RETRIES = 3
const PAST_DUE_GRACE_MS = 7 * ONE_DAY_MS

const TIER_PRICE_BYN_KOPECKS: Record<string, number> = {
  MONITOR_START: 9900,
  MONITOR_PRO: 39900,
  MONITOR_AGENT: 69900,
}

const TIER_PRICE_RUB_KOPECKS: Record<string, number> = {
  MONITOR_START: 299000,
  MONITOR_PRO: 999000,
  MONITOR_AGENT: 1999000,
}

export const subscriptionBilling = schedules.task({
  id: "subscription-billing",
  // Запускается каждый день в 7:00 UTC (до follow-up-scheduler, идущего в 9:00)
  cron: "0 7 * * *",

  run: async () => {
    const now = new Date()

    const due = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        nextChargeAt: { lte: now },
        OR: [{ bindingId: { not: null } }, { paymentMethodId: { not: null } }],
      },
      include: { client: true },
    })

    console.log(`[subscription-billing] ${due.length} subscriptions due`)

    let charged = 0
    let failed = 0

    for (const sub of due) {
      const priceTable = sub.market === "ru" ? TIER_PRICE_RUB_KOPECKS : TIER_PRICE_BYN_KOPECKS
      const amount = priceTable[sub.tier]
      if (!amount) {
        console.error(`[subscription-billing] Unknown tier price for ${sub.tier}, skipping ${sub.id}`)
        continue
      }

      const periodKey = now.toISOString().slice(0, 7) // YYYY-MM — one charge attempt per calendar month
      const orderNumber = `sub-${sub.id}-${periodKey}`
      const description = `KaliGEO — подписка ${sub.tier}, ${sub.client.companyName}`

      let result: { ok: boolean; error?: string }

      try {
        if (sub.provider === "yookassa" && sub.paymentMethodId) {
          result = await chargeSavedMethod({
            amount,
            currency: "RUB",
            paymentMethodId: sub.paymentMethodId,
            description,
            metadata: { subscriptionId: sub.id },
            idempotenceKey: orderNumber,
          })
        } else if (sub.provider === "alfabank" && sub.bindingId) {
          result = await chargeBinding({
            merchant: merchantForMarket(sub.market),
            bindingId: sub.bindingId,
            amount,
            currency: sub.market === "ru" ? "643" : "933",
            orderNumber,
            description,
          })
        } else {
          console.error(`[subscription-billing] Subscription ${sub.id} has no usable payment method`)
          continue
        }
      } catch (err) {
        result = { ok: false, error: err instanceof Error ? err.message : "Charge threw" }
      }

      if (result.ok) {
        charged++

        const lastJob = await prisma.auditJob.findFirst({
          where: { subscriptionId: sub.id },
          orderBy: { createdAt: "desc" },
        })

        const newJob = await prisma.auditJob.create({
          data: {
            clientEmail: sub.client.email,
            websiteUrl: lastJob?.websiteUrl ?? sub.client.websiteUrl ?? "",
            companyName: sub.client.companyName,
            niche: lastJob?.niche ?? "",
            competitors: lastJob?.competitors ?? [],
            tier: sub.tier as never,
            market: sub.market,
            clientId: sub.clientId,
            subscriptionId: sub.id,
            baselineJobId: lastJob?.id,
            adminNotes: `Автосписание по подписке ${sub.id}`,
            paidAt: now,
            status: "PENDING",
          },
        })

        await tasks.trigger<typeof auditPipeline>("audit-pipeline", { jobId: newJob.id })

        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            nextChargeAt: new Date(now.getTime() + ONE_MONTH_MS),
            lastChargeAt: now,
            lastChargeError: null,
            failedChargeCount: 0,
          },
        })

        notifySubscriptionCharged({
          companyName: sub.client.companyName,
          tier: sub.tier,
          jobId: newJob.id,
        }).catch(console.error)

        console.log(`[subscription-billing] Charged subscription ${sub.id}, created job ${newJob.id}`)
      } else {
        failed++
        const failedChargeCount = sub.failedChargeCount + 1

        if (failedChargeCount >= MAX_RETRIES) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "PAST_DUE", failedChargeCount, lastChargeError: result.error },
          })
          notifySubscriptionPastDue({
            companyName: sub.client.companyName,
            email: sub.client.email,
            tier: sub.tier,
            error: result.error ?? "unknown",
          }).catch(console.error)
        } else {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              nextChargeAt: new Date(now.getTime() + ONE_DAY_MS),
              failedChargeCount,
              lastChargeError: result.error,
            },
          })
        }

        console.error(`[subscription-billing] Charge failed for subscription ${sub.id}: ${result.error}`)
      }
    }

    // Auto-cancel subscriptions stuck PAST_DUE beyond the grace period
    const staleCutoff = new Date(now.getTime() - PAST_DUE_GRACE_MS)
    const stale = await prisma.subscription.findMany({
      where: { status: "PAST_DUE", updatedAt: { lte: staleCutoff } },
      include: { client: true },
    })

    for (const sub of stale) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "CANCELED", canceledAt: now },
      })
      notifySubscriptionCanceled({
        companyName: sub.client.companyName,
        email: sub.client.email,
        tier: sub.tier,
        reason: "payment_failed",
      }).catch(console.error)
    }

    return { due: due.length, charged, failed, autoCanceled: stale.length }
  },
})
