# Internal Gemini migration — 2026-10-27

Implemented and deployed:
- Flash: question relevance judge, advanced narratives, competitor gap analysis, content/growth plans, Website Fix, report action/notes, post-audit chat, administrative tool orchestration.
- Flash-Lite: mention classification, executive summaries and intake chat.
- Retained independent GPT-4o question generator, OpenAI competitor extraction and existing Standard GPT-4o-mini action plan. These were not Anthropic dependencies.
- Claude measurement client and explicitly selected Claude diagnostic tests remain actual Anthropic calls. Never substitute Gemini answers under a Claude platform label.

Internal generation uses `gemini-2.5-flash` / `gemini-3.1-flash-lite`. Flash thinking budget is 1024; Lite uses minimal thinking. Calls have bounded outputs; migrated internal generation calls disable automatic SDK retries. Report analysis caches include the internal-model revision, with stable answer ordering.

Usage of non-streamed Gemini calls is logged. Calls within cached analysis stages also persist model, stage, input/output/reasoning/cache tokens and estimated USD in `analysisSnapshot.internalAiUsage`. This is not yet a comprehensive ledger for external measured platforms, OpenAI calls, raw Google SDK calls or streamed chats. There is no hard per-audit USD cap in this change. Missing token usage remains unknown, never zero. Initial monitoring copies clear internal usage to avoid counting source expenses twice.

Validation: 472 tests / 50 files passed; TypeScript and targeted lint passed; production builds passed. Trigger deployment 20261027.6; Vercel production URL https://kaligeo-service-4k3uioh63-1alexeikalinin1-3683s-projects.vercel.app (app.kaligeo.by).

Live acceptance: Flash narratives, content and competitor gaps completed. Google rejected 2.5 Flash-Lite for new users on this account. Real 3.1 Flash-Lite calls successfully classified all 16 mentions and persisted the semantic stage; two calls cost an estimated $0.0025695. Advanced then completed on production and was copied to monitoring. All six jobs are completed, pages and PDFs verified. Eleven internal Gemini calls cost an estimated $0.08876576 (excluding platform queries and other providers).
