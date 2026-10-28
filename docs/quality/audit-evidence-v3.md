# Audit quality changes — 2026-10-27

## Measurement

- 15/30/50 total questions include two explicit brand questions. The two direct questions do not enter spontaneous visibility scores.
- Historical mention rates no longer bias query selection toward questions likely to mention the brand.
- External services require a literal website quote offering services to customers or partners. Own product development is not evidence of outsourcing services.
- Target regions come from the website, not the payment market.
- Candidate questions undergo relevance review. A short approved set is supplemented and reviewed again; unchecked candidates are not used to reach the tariff count.
- Historical year references are excluded from new current-visibility questions.

## Evidence

- Technical findings no longer derive from a low visibility score.
- Markup absence is scoped to fetched HTML pages, with URL and timestamp; JavaScript-generated markup is not inspected.
- Wikipedia title matches are recorded as candidate articles. A failed or empty search does not establish absence; article identity/content is not independently verified.
- No claims about Wikidata, review counts, bots, Google/Yandex Business, Reddit or YouTube presence are inferred from visibility.
- Competitor discovery uses actual answer excerpts. Accepted names require literal supporting quotes. These are observed AI alternatives, not an independently verified market census.

## Recovery and monitoring

- Stable answer IDs prevent duplicate rows on retries. Already saved answers are retained, including when new question sets overlap them.
- Successful analysis stages are persisted with an input fingerprint. Failed stages are retried without rerunning completed stages. Semantic provider/validation/storage errors fail the stage instead of fabricating neutral scores.
- Coverage is checked per question and platform. Missing/empty answers prevent report publication.
- A regenerated question set is retained on retry; retries do not restart generation after it has been saved.
- Rebuilding a report invalidates cached Website Fix recommendations; PDF is rebuilt before completion.
- `reuseBaseline` copies a completed report and its measurements without any AI calls. It checks ownership, market, URL, base tier and answer completeness, and preserves the original measurement date.
- First monitoring jobs can reuse a completed one-off audit. Later jobs retain baseline questions and platforms.
- The report UI suppresses trend comparison if questions, platforms or methodology differ.

## Validation

469 tests passed, including provider failure/recovery, incomplete coverage, short question approval, historical questions, unverified service claims, fabricated competitor quotes, score separation, baseline ownership and zero-AI copying. Type checking and production builds passed. Actual Astrum QA refresh is tracked separately; test success alone does not establish completion of production reports.
