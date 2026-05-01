Run a quick smoke test of the audit pipeline for a single platform.

Steps:
1. Read `lib/ai-clients/index.ts` to see available platforms
2. Pick the first platform in ACTIVE_PLATFORMS (usually CHATGPT)
3. Read `trigger/steps/execute-queries.ts` to understand the execution flow
4. Create a minimal test: call the AI client directly with 2 test queries:
   - "What are the best tools for [test niche]?"
   - "Recommend a company for [test niche] in Russia"
   Use companyName="TestCo", websiteUrl="https://test.com", competitors=[]
5. Print the raw response from the AI client
6. Run extractMentions() on the response and print the result
7. Report: which platforms responded, response length, any errors
