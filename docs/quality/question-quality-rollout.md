# Question quality rollout

User decision: implement in phases; do not start another Astrum audit. After all corrections are implemented and verified, remind Alexei to select a different client for acceptance testing.

## Phase 1 — implemented locally, not deployed

Mandatory exact-version question approval before platform requests. Admin queue `/admin/question-review`; manual question editing, reviewer notes, saved feedback history, explicit approval and idempotent dispatch. Saved edits require a separate approval. Optimistic concurrency rejects stale edits. A failed dispatch can be retried against the approved version.

Validation: 475 tests pass, TypeScript and targeted lint pass. Includes a pipeline test proving unapproved questions issue zero platform requests. No new customer audit was started.

## Phase 2 — implemented locally; live UI acceptance and deployment pending

Evidence-linked business map: organization, products, services, categories, relationships (owns/develops/publishes/resells), audiences, needs and geography. Each fact has a page and quote, or is labelled uncertain. Discover relevant internal links rather than relying only on generic page paths. Admin can correct scope and facts before generation.

Phase 2 implementation adds cited source documents, same-origin link discovery (bounded to 12 pages), schema-validated business entities/relationships/audiences/scope, literal citation verification, uncertain-fact flags and mandatory map approval before question generation. Admin can edit entities, attributes and audiences, confirm relationships and choose measurement directions. Feedback is persisted, not model training. Generator and judge receive the approved map.

## Phase 3 — implemented locally; live acceptance pending

Structured question proposals: audience, need, intent, target entity, rationale, supporting evidence, expected answer type, scoring eligibility and explicit mention rules. Independent critique per question plus coverage review for the complete set. Never enforce industry-specific categories globally. Distinguish corporate, owned-product and reseller visibility.

Phase 3: two separate AI calls prepare typed cards and critically evaluate every question. Deterministic checks reject invented entity names/evidence, incorrect seller/product/company answer types, brand cues in spontaneous questions, missing or duplicate question reviews, and uncovered scope. Admin sees decisions, explanations and proposed edits, which require save/review/approval. Reviews bind to both map and question versions. Product-aware answer counting is still pending; do not run customer acceptance before that is implemented.

## Phase 4 — partly implemented locally

Admin feedback drives selective regeneration and displayed before/after differences. Keep approved questions unchanged until reapproval. Telegram notification links to the review page with delivery status. Client confirmation is optional; internal review remains required. Expose an understandable awaiting-review state in customer views.

Telegram notification delivery status and deduplication per review version are implemented with tests for duplicate claims and API rejection. Real delivery and UI acceptance remain pending.

## Phase 5 — partly implemented locally

Curate feedback examples by business pattern; use approved examples for retrieval in generation and independent evaluation. No claim of model training or quality improvement merely because feedback is stored. Keep evaluation cases separate; require verified reviewer decisions and avoid client-data leakage across businesses.

Same-audit reviewer notes and previously approved examples now feed the question annotator and critic. Unapproved examples are excluded. Cross-client curated retrieval, selective regeneration and evaluation of learning quality remain pending.

## Phase 6 — in progress locally

Entity-aware scoring, controlled product aliases and explicit relationship attribution. Preserve question/scope/portfolio/scoring versions for comparable monitoring. Invalidate old Astrum baselines explicitly before any new monitoring comparison. Regression and UI verification; deploy web and worker together. Then remind user to choose a new client, approve their question set and run one acceptance audit.

Entity coverage now computes separate per-entity, audience and metric mention counts/rates with per-platform breakdowns and literal answer evidence. Exact Unicode-aware name boundaries prevent substring false positives. Duplicate answers count once; unmeasured scope returns null. Explicit map aliases are editable and require map reapproval. Measurement-rule hashes gate report trend comparability. Company-name extraction remains separate. Legacy headline/PDF analytics still require adaptation before production rollout; do not run a new client audit yet.
