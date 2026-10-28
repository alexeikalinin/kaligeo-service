# Astrum acceptance — 27 October 2026

## Verified completed reports

| Tier | Questions | Platforms | Answers | Direct brand mentions | Spontaneous score | PDF |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| BASIC | 15 | 3 | 45 | 6/6 | 0 | Not included in implementation |
| STANDARD | 30 | 6 | 180 | 12/12 | 0 | Downloaded, PDF header verified |
| ADVANCED | 50 | 8 | 400 | 16/16 | 0 | Downloaded, PDF header verified |

All three production report URLs returned HTTP 200 and rendered Astrum. All three monitoring baselines were copied with zero model calls. Questions, measurement timestamps and all report analysis fields match their corresponding one-off reports. The cabinet contains exactly six Astrum records.

Zero spontaneous visibility is distinct from knowledge of the company: every direct brand question in these two tiers produced a mention. This measures the company name, not portfolio-wide game visibility.

## Advanced completed after model replacement

All 400 answers were retained. Flash completed competitor, gap and sentiment narratives, content recommendations, competitor gaps and the growth plan. Flash-Lite 3.1 classified 16 mentions. The plan contains 10 actions across 30/60/90 days, three quick wins and an eight-week calendar. All six reports are COMPLETED; both PDFs and all three source report pages were verified, and all monitoring copies match their source reports.

Eleven successful internal Gemini calls recorded 113,680 input and 24,544 output tokens (including reasoning), estimated at $0.08876576 using the configured standard/cache prices. This excludes measured-platform requests and OpenAI/other service calls; it is not the full audit bill.

## Remaining product/quality limits

- Live landing page promises BASIC PDF and top-three competitors; current gates disable both. This is still a mismatch.
- STANDARD benchmark has only one historical sample; no representative niche comparison is available.
- Competitor matrix contains observed alternatives, including product names. Company/product identity and aliases are not independently verified; it is not a verified competitor census.
- STANDARD plan has nine actions but remains broad. It lacks task-by-task answer citations and does not establish causal effects.
- Site technical checks cover fetched HTML, not rendered JavaScript. Wikipedia name matches do not establish article identity; Wikidata is not independently checked.
- Advanced's nine-platform promise is intentionally reduced to eight for this test per the user's exclusion of GigaChat.
- Monthly automation, alert delivery, Website Fix and post-audit chat are not established by report regeneration alone.

## Engineering verification

472 unit tests pass (50 files), TypeScript and targeted lint pass. Trigger production version `20261027.6` contains evidence and recovery fixes. Vercel production deployment `dpl_GMniYmzPrTXutSgUFVqQerK89Uvq` serves the report methodology UI. Static Prisma null handling was verified by completed production BASIC and STANDARD runs. Production retries retain saved answers and completed analysis stages.

Email delivery is pending correction of the invalid local Resend API key.
