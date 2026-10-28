# Internal model replacement assessment — 2026-10-27

Status: code inventory and public-price research only. No paid model calls, model replacement, production deployment or audit regeneration performed for this assessment.

## Scope

Retain `lib/ai-clients/anthropic.ts` as the measured Claude platform. Replace internal generation/analysis dependencies separately. Provider availability for a measured platform must not determine which provider prepares the report. Do not replace a failed Claude measurement with another model's answer labelled Claude.

## Inventory

- `trigger/steps/generate-queries.ts`: Haiku relevance judge, potentially multiple calls while supplementing a short approved set.
- `lib/agents/semantic-analysis-agent.ts`: Haiku context classification in batches of ten mentioned answers.
- `lib/agents/analysis-agent.ts`: three Sonnet narratives and one structured competitor-gap call.
- `lib/agents/content-agent.ts`: one Sonnet content-plan call.
- `lib/agents/growth-plan-agent.ts`: four Sonnet calls with repeated shared context.
- `lib/agents/report-agent.ts`: Sonnet for individually requested section regenerations.
- `lib/agents/website-fix-agent.ts`: five Sonnet calls when Website Fix is requested.
- `lib/agents/orchestrator.ts`: up to ten Sonnet iterations, with invoked tools potentially adding model calls. This is not the automatic audit pipeline.
- `lib/models.ts`: central model factories cover only part of the calls; changing this file alone leaves direct Anthropic SDK calls in place. Existing price comments are outdated.

## Recommended routing (candidates, not benchmarked replacements)

1. Code: counts, scoring, coverage, exact quote checks, deterministic deduplication, dates, JSON validation, baseline copying, fixed workflow routing.
2. Gemini 2.5 Flash-Lite: extraction, mention classification, report formatting and short summaries. Escalate uncertain cases rather than manufacturing neutral scores.
3. Gemini 2.5 Flash: relevance judge, evidence-based competitor/gap/sentiment analysis, content plan, growth plan and Website Fix. Existing Google integration reduces migration scope.
4. GPT-6 Luna: independent quality-check candidate and second-provider fallback, subject to account access, SDK compatibility and corpus evaluation.
5. DeepSeek Flash: alternative candidate for extraction and analysis; evaluate Russian output, schema compliance, evidence fidelity and retries. Use peak prices for conservative budgeting.

A model evaluating its own generated question pool may reproduce its biases. Preserve independent review using another provider where practical; keep deterministic website-evidence filters regardless of provider.

## Published prices checked

USD per million uncached text input / billed output tokens, standard service:

| Model | Input | Output |
|---|---:|---:|
| Claude Sonnet 4.6 | 3.00 | 15.00 |
| Claude Haiku 4.5 | 1.00 | 5.00 |
| Gemini 2.5 Flash | 0.30 | 2.50 |
| Gemini 2.5 Flash-Lite | 0.10 | 0.40 |
| GPT-6 Luna | 0.10 | 0.50 |
| DeepSeek Flash, peak | 0.30 | 1.20 |
| DeepSeek Flash, off-peak | 0.15 | 0.60 |

Sources:
- https://platform.claude.com/docs/en/about-claude/pricing
- https://ai.google.dev/gemini-api/docs/pricing
- https://developers.openai.com/api/docs/pricing
- https://api-docs.deepseek.com/quick_start/pricing/

Google output prices include thinking. Tokenization and reasoning volume differ by model. A lower unit price does not establish equal quality or a fixed bill for the same task.

Illustrative normalized workload of 100,000 input and 20,000 billed output tokens: Sonnet $0.60; Flash $0.08; Flash-Lite $0.018; GPT-6 Luna $0.02; DeepSeek Flash peak $0.054. These are arithmetic examples, not measured Astrum usage or complete-audit prices. Search, tool charges, other measured AI platforms, retries and taxes are excluded.

GPT-4.1 Mini and GPT-5 Mini model pages are marked deprecated as of this check; do not select them as a fresh migration target solely from old price lists.

## Required controls before production migration

- Record provider/model, job, stage, attempt, input/output/reasoning/cache tokens, pricing version and estimated USD for every internal and measured-platform request. Missing usage is unknown, never zero.
- Enforce configurable per-job budget reservation across concurrent calls; preserve partial work and report the precise blocked stage. Do not restore arbitrary daily request quotas.
- Bound output, context and thinking tokens explicitly. Retry transient errors only; do not retry insufficient credit/authentication failures.
- Cache successful stages with a deterministic fingerprint of sorted answer IDs, model ID, prompt revision and methodology. Preserve sub-results of multi-call stages as well.
- Generate a shared evidence summary once; reuse it across sections. Consolidate repeated narratives where output remains within bounds; do not turn the entire report into an oversized single response.
- Reuse baseline reports for initial monitoring; later measurements must issue new platform queries using the same question set.

## Acceptance before rollout

Run bounded comparisons only on saved answers, without requerying the measured platforms. Verify complete JSON/schema output, exact supporting quotes and answer IDs, no invented services or unsupported site diagnoses, separate spontaneous/brand statistics, actionable tasks linked to findings, Russian clarity, stage recovery and actual token costs. Include more than one business niche before making service-wide quality claims.

Do not assert equivalence to Sonnet or guaranteed per-audit savings before this comparison. The historical $5 expense cannot be attributed precisely because per-call usage was not persisted.
