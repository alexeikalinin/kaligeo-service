# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start Next.js dev server
npm run build        # production build
npm run lint         # ESLint
npx prisma generate  # regenerate Prisma client after schema changes
npx prisma db push   # push schema to DB (no migration files)
npx prisma studio    # GUI DB browser
npx trigger.dev@latest dev  # start Trigger.dev worker (required for pipeline)
```

TypeScript check: `npx tsc --noEmit`

## Architecture

**KaliGEO** audits how visible a brand is across AI platforms (ChatGPT, Gemini, Claude, Perplexity, DeepSeek, YandexGPT, GigaChat, Alisa). It submits natural language queries to each platform and measures whether the brand is mentioned, the sentiment, and competitor presence.

### Request flow

1. Admin submits audit via `/admin` → `POST /api/audit/submit` creates `AuditJob` in Postgres and enqueues `audit-pipeline` on Trigger.dev.
2. `trigger/audit-pipeline.ts` orchestrates the full async run (up to 1 hour):
   - **Step 1** `generateQueries` — GPT-4o-mini writes N queries (15/30/50 depending on tier)
   - **Step 2** `executeQueriesOnPlatform` — runs queries in parallel across all active platforms; each stores a `QueryResult`
   - **Step 3** Pure analysis: `calculateVisibilityScores`, `buildCompetitorMatrix`, `detectWeakPoints`
   - **Step 4** ADVANCED only: parallel `runAnalysisAgent` (competitors/gaps) + `runContentAgent`
   - **Step 5** Action plan: `runGrowthPlanAgent` (ADVANCED) or `generateActionPlan` (STANDARD)
   - **Step 6** PDF via `@react-pdf/renderer` → Vercel Blob
   - **Step 7** Email delivery via Resend
3. Client polls `GET /api/audit/[id]/status` to track progress. Report is available at `/report/[id]?token=...`

### Key directories

| Path | Purpose |
|------|---------|
| `lib/ai-clients/` | One file per AI platform, all implementing `AIClient` interface (`lib/ai-clients/types.ts`). `index.ts` exports `getActivePlatforms()` — returns only platforms with configured API keys. |
| `lib/agents/` | Specialized Claude-powered agents: `analysis-agent`, `content-agent`, `growth-plan-agent`, `website-fix-agent`, `risk-agent`. `orchestrator.ts` is a tool-calling loop (Anthropic SDK) that dispatches to agents. |
| `lib/analysis/` | Pure functions: score calculation, competitor matrix, weak-points detection, mention extraction. No AI calls. |
| `lib/gates.ts` | Single source of truth for tier feature flags (`BASIC` / `STANDARD` / `ADVANCED`). Check here before gating any feature. |
| `lib/models.ts` | Centralised AI model name constants. |
| `trigger/` | Trigger.dev tasks. `audit-pipeline.ts` is the main task; `trigger/steps/` has individual step modules. |
| `components/report/` | Report UI components (React, Recharts). Each tab in the report dashboard is a separate component. |
| `app/api/` | Next.js App Router API routes. |
| `prisma/schema.prisma` | Postgres schema: `AuditJob`, `QueryResult`, `Report`, `FreemiumScan`, `Lead`, `Campaign`, `OutreachEmail`. |

### Tiers

`BASIC` → `STANDARD` → `ADVANCED` unlock more platforms, queries, PDF, action plan, post-audit chat, AI agents, and `hasWebsiteFix` (Google Stitch page-fix). See `lib/gates.ts` for exact feature flags per tier.

### Adding a new AI platform

1. Create `lib/ai-clients/<platform>.ts` implementing `AIClient` (name, `isConfigured()`, `query()`).
2. Register it in `lib/ai-clients/index.ts`.
3. Add the enum value to `prisma/schema.prisma → Platform` and run `npx prisma db push`.
4. Add the platform to the appropriate tier(s) in `lib/gates.ts`.

### Infrastructure

- **Database**: Neon Postgres via `@prisma/adapter-pg`. `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) required.
- **Blob storage**: Vercel Blob (`BLOB_READ_WRITE_TOKEN`) — stores generated PDFs.
- **Queue / background jobs**: Trigger.dev (`TRIGGER_SECRET_KEY`). The worker must be running locally (`npx trigger.dev@latest dev`) for pipeline to execute.
- **Email**: Resend (`RESEND_API_KEY`, `FROM_EMAIL`).
- **Cache / rate-limiting**: Upstash Redis (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
- **Admin auth**: cookie-based session via `ADMIN_SESSION_TOKEN`; internal API calls use `INTERNAL_SECRET` header.

### Report access

Reports are token-gated: `AuditJob.reportToken` is appended to the URL. The report page fetches data from `GET /api/report/data/[id]` and verifies the token server-side.
